const { gql } = require('apollo-server-express');

module.exports.typeDefs = gql`
  extend type Query {
    me: User
    user(id: ID!): User!
  }
  type User {
    id: ID!
    email: String!
    avatar: String!
    userName: String!
    createdAt: String
    modifiedAt: String
  }
`;

module.exports.resolvers = {
  Query: {
    user: async (_, { id }, { users: { getUserById } }) => getUserById(id),
    me: async (_, __, { user, users: { getUserById } }) =>
      getUserById(user.sub),
  },
};
