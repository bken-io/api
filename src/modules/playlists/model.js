const mongoose = require('mongoose');

const { Schema } = mongoose;

const playlistSchema = new Schema(
  {
    _id: { auto: true, type: Schema.Types.ObjectId },
    title: { type: String, required: true },
    default: { type: Boolean, required: true, index: true },
    items: [{
      ref: 'Video',
      type: String,
      required: true,
    }],
    user: {
      ref: 'User',
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Playlist', playlistSchema);
