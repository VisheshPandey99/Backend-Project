import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 1. Toggle subscription (subscribe <-> unsubscribe)
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    // A user cannot subscribe to their own channel
    if (channelId.toString() === req.user?._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    // Check if channel exists
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    // Check if the user is already subscribed
    const existingSubscription = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    });

    if (existingSubscription) {
        // Unsubscribe
        await Subscription.findByIdAndDelete(existingSubscription._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isSubscribed: false }, "Unsubscribed successfully"));
    } else {
        // Subscribe
        await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId
        });

        return res
            .status(200)
            .json(new ApiResponse(200, { isSubscribed: true }, "Subscribed successfully"));
    }
});

// 2. Get subscriber list of a channel (who subscribed to this channel)
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const channelId = req.params.channelId || req.params.subscriberId;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscribers = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username fullname avatar")
        .sort({ createdAt: -1 });

    const subscriberList = subscribers
        .filter((sub) => sub.subscriber)
        .map((sub) => sub.subscriber);

    return res
        .status(200)
        .json(new ApiResponse(200, subscriberList, "Channel subscribers fetched successfully"));
});

// 3. Get channel list to which user has subscribed (channels I subscribed to)
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId = req.params.subscriberId || req.params.channelId;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const subscriptions = await Subscription.find({ subscriber: subscriberId })
        .populate("channel", "username fullname avatar coverImage")
        .sort({ createdAt: -1 });

    const channelList = subscriptions
        .filter((sub) => sub.channel)
        .map((sub) => sub.channel);

    return res
        .status(200)
        .json(new ApiResponse(200, channelList, "Subscribed channels fetched successfully"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};
