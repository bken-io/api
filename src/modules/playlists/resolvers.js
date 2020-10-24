const Playlist = require('./model');

const resolvers = {
  Query: {
    playlist(_, { id }) {
      return Playlist.findByid(id);
    },
  },
  Mutation: {
    async createPlaylist(_, { input }, { user, authenticate }) {
      authenticate();
      console.log('input', input);
    },
  },
};

module.exports = resolvers;
