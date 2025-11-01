import { Types } from 'mongoose';
import { Comment } from '../models/Comment';
import { Like } from '../models/Like';
import { SavedItem } from '../models/SavedItem';
import { Notification } from '../models/Notification';

export async function cascadeDeletePost(postId: string | Types.ObjectId) {
  const pid = new Types.ObjectId(postId);
  const comments = await Comment.find({ post: pid }).select('_id');
  const cids = comments.map((c) => c._id);
  await Comment.deleteMany({ post: pid });
  await Like.deleteMany({ $or: [{ post: pid }, { comment: { $in: cids } }] });
  await SavedItem.deleteMany({ post: pid });
  await Notification.deleteMany({ $or: [{ targetType: 'post', targetId: pid }, { targetType: 'comment', targetId: { $in: cids } }] });
}

export async function cascadeDeleteComment(commentId: string | Types.ObjectId) {
  const cid = new Types.ObjectId(commentId);
  // delete comment and its replies recursively
  const all = await Comment.aggregate([
    { $match: { _id: cid } },
    {
      $graphLookup: {
        from: 'comments',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentComment',
        as: 'replies'
      }
    },
    { $project: { ids: { $concatArrays: [['$_id'], '$replies._id'] } } }
  ]);
  const ids = all[0]?.ids || [cid];
  await Comment.deleteMany({ _id: { $in: ids } });
  await Like.deleteMany({ comment: { $in: ids } });
  await Notification.deleteMany({ targetType: 'comment', targetId: { $in: ids } });
}
