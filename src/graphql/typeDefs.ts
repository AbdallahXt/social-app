export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String
    avatar: String
    bio: String
  }

  type Post {
    id: ID!
    author: User!
    content: String!
    isFrozen: Boolean!
    createdAt: String!
  }

  type Comment {
    id: ID!
    author: User!
    post: Post!
    content: String!
    parentComment: ID
    createdAt: String!
    replies: [Comment]!
  }

  type Query {
    me: User
    user(id: ID!): User
    post(id: ID!): Post
    comment(id: ID!): Comment
  }

  type Mutation {
    createPost(content: String!): Post
    updatePost(id: ID!, content: String!): Post
    createComment(postId: ID!, parentComment: ID, content: String!): Comment
    updateComment(id: ID!, content: String!): Comment
  }
`;
