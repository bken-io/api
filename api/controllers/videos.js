const s3 = require('../config/s3');
const mime = require('mime-types');
const mongoose = require('mongoose');

const Video = require('../models/video');
const View = require('../models/view');

const convertObjectToDotNotation = require('../lib/convertObjectToDotNotation');

const { MEDIA_BUCKET_NAME } = require('../config/config');

const buildSourceFileKey = (id, fileType) => {
  return `videos/${id}/source.${mime.extension(fileType)}`;
};

const emptyS3Dir = async (Prefix) => {
  const Bucket = MEDIA_BUCKET_NAME;
  const { Contents } = await s3.listObjectsV2({ Bucket, Prefix }).promise();
  return Promise.all(
    Contents.map(({ Key }) => {
      console.log(`Deleting ${Key}`);
      return s3.deleteObject({ Bucket, Key }).promise();
    })
  );
};

exports.createMultipartUpload = async (req, res) => {
  try {
    const video = await Video({
      status: 'uploading',
      user: req.user.id,
      title: req.body.fileName,
    }).save();

    // This should really happen on multipart upload complete, not create
    await Video.updateOne(
      { _id: video._id },
      {
        $set: convertObjectToDotNotation({
          sourceFile: `${MEDIA_BUCKET_NAME}/${buildSourceFileKey(
            video._id,
            req.body.fileType
          )}`,
        }),
      }
    );

    const { UploadId, Key } = await s3
      .createMultipartUpload({
        Bucket: MEDIA_BUCKET_NAME,
        Key: buildSourceFileKey(video._id, req.body.fileType),
        ContentType: req.body.fileType,
      })
      .promise();

    res.status(200).send({
      message: 'started multipart upload',
      payload: {
        key: Key,
        uploadId: UploadId,
      },
    });
  } catch (err) {
    console.log(err);
  }
};

exports.getVideos = async (req, res) => {
  try {
    res.status(200).send({
      message: 'query for videos was successfull',
      payload: await Video.find({ user: req.user.id })
        .populate('user', '_id email displayName')
        .sort({
          createdAt: 'descending',
        }),
    });
  } catch (error) {
    console.error(error);
    return res.status(404).send({
      message: 'not found',
    });
  }
};

exports.getVideo = async (req, res) => {
  try {
    const referrer = req.get('Referrer');

    if (referrer && referrer.includes('https://bken.io')) {
      await new View({
        _id: mongoose.Types.ObjectId(),
        video: req.params.id,
        // TODO :: Since getVideo is not an authed route, we don't have the userId here, we should have
        // two auth middlewares, requireAuth, and optionalAuth
      }).save();

      await Video.updateOne({ _id: req.params.id }, { $inc: { views: 1 } });
    }

    const video = await Video.findOne({ _id: req.params.id }).populate(
      'user',
      '_id email displayName'
    );

    if (video) {
      res.status(200).send({
        message: 'query for video was successfull',
        payload: video,
      });
    } else {
      return res.status(404).send({
        message: 'not found',
      });
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

exports.updateVideo = async (req, res) => {
  try {
    res.status(200).send({
      message: 'post patched successfully',
      payload: await Video.updateOne(
        { _id: req.params.id },
        { $set: convertObjectToDotNotation(req.body) }
      ),
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const videoRecord = await Video.findOne({ _id: req.params.id });

    if (req.user.id.toString() !== videoRecord.user.toString()) {
      return res.status(401).send();
    } else if (videoRecord.status !== 'completed') {
      return res.status(400).send({ message: 'video is still processing' });
    } else {
      await emptyS3Dir(`videos/${req.params.id}`);
      // TODO :: Delete comments
      const viewDeleteRes = await View.deleteMany({ videoId: req.params.id });
      const videoDeleteRes = await Video.deleteOne({ _id: req.params.id });

      res.status(400).send({
        message: 'video was deleted',
        payload: {
          videosDeleted: videoDeleteRes.deletedCount,
          viewsDeleted: viewDeleteRes.deletedCount,
        },
      });
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};
