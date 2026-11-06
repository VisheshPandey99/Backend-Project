import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 1. Toggle like on a video
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Check if the video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if the user already liked this video
    const existingLike = await Like.findOne({
        video: videoId,
        $or: [{ likedBy: req.user?._id }, { LikeBy: req.user?._id }]
    });

    if (existingLike) {
        // If already liked, remove like (unlike)
        await Like.findByIdAndDelete(existingLike._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"));
    } else {
        // If not liked, add like
        await Like.create({
            video: videoId,
            likedBy: req.user?._id,
            LikeBy: req.user?._id
        });

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }, "Video liked successfully"));
    }
});

// 2. Toggle like on a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    // Check if the comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Check if the user already liked this comment
    const existingLike = await Like.findOne({
        $and: [
            { $or: [{ comment: commentId }, { Comment: commentId }] },
            { $or: [{ likedBy: req.user?._id }, { LikeBy: req.user?._id }] }
        ]
    });

    if (existingLike) {
        // If already liked, remove like (unlike)
        await Like.findByIdAndDelete(existingLike._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"));
    } else {
        // If not liked, add like
        await Like.create({
            comment: commentId,
            Comment: commentId,
            likedBy: req.user?._id,
            LikeBy: req.user?._id
        });

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }, "Comment liked successfully"));
    }
});

// 3. Toggle like on a tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    // Check if the tweet exists
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Check if the user already liked this tweet
    const existingLike = await Like.findOne({
        $and: [
            { $or: [{ tweet: tweetId }, { Tweet: tweetId }] },
            { $or: [{ likedBy: req.user?._id }, { LikeBy: req.user?._id }] }
        ]
    });

    if (existingLike) {
        // If already liked, remove like (unlike)
        await Like.findByIdAndDelete(existingLike._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully"));
    } else {
        // If not liked, add like
        await Like.create({
            tweet: tweetId,
            Tweet: tweetId,
            likedBy: req.user?._id,
            LikeBy: req.user?._id
        });

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }, "Tweet liked successfully"));
    }
});

// 4. Get all videos liked by the logged-in user
const getLikedVideos = asyncHandler(async (req, res) => {
    // Find all likes where video is present for the logged-in user
    const likes = await Like.find({
        $and: [
            { video: { $exists: true, $ne: null } },
            { $or: [{ likedBy: req.user?._id }, { LikeBy: req.user?._id }] }
        ]
    })
    .populate({
        path: "video",
        populate: {
            path: "owner",
            select: "username fullname avatar"
        }
    })
    .sort({ createdAt: -1 });

    // Extract only the populated video objects, filtering out any deleted videos
    const likedVideos = likes
        .filter((like) => like.video)
        .map((like) => like.video);

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
};
