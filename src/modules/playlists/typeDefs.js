const { gql } = require('apollo-server-express');

module.exports = gql`
  extend type Query {
    playlist(id: String!): Playlist!
  }
  type Playlist {
    id: String!
    name: String!
    videos: [Video!]! # may want to create limited schema
  }
`;