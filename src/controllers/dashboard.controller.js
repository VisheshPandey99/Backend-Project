import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 1. Get channel stats (total views, total subscribers, total videos, total likes)
const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    // 1. Total subscribers for this channel
    const totalSubscribers = await Subscription.countDocuments({
        channel: userId
    });

    // 2. Video stats (total videos count and sum of all video views)
    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" }
            }
        }
    ]);

    const totalVideos = videoStats[0]?.totalVideos || 0;
    const totalViews = videoStats[0]?.totalViews || 0;

    // 3. Total likes on all videos uploaded by this channel
    const channelVideoIds = await Video.find({ owner: userId }).distinct("_id");
    const totalLikes = await Like.countDocuments({
        video: { $in: channelVideoIds }
    });

    const stats = {
        totalSubscribers,
        totalVideos,
        totalViews,
        totalLikes
    };

    return res
        .status(200)
        .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

// 2. Get all videos uploaded by the channel (both published and unpublished)
const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    // Fetch all videos uploaded by the logged-in creator, sorted newest first
    const videos = await Video.find({ owner: userId }).sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export {
    getChannelStats,
    getChannelVideos
};
