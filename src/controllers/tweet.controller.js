import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 1. Create a new tweet
const createTweet = asyncHandler(async (req, res) => {
    // Get content from request body
    const { content } = req.body;

    // Validation: content must not be empty
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required");
    }

    // Create tweet in database
    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user?._id
    });

    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet");
    }

    // Return success response
    return res
        .status(201)
        .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

// 2. Get all tweets by a specific user
const getUserTweets = asyncHandler(async (req, res) => {
    // Get userId from request URL parameters
    const { userId } = req.params;

    // Validation: check if userId is a valid MongoDB ObjectId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // Find all tweets belonging to this user, sorted newest first
    const tweets = await Tweet.find({ owner: userId })
        .populate("owner", "username fullname avatar")
        .sort({ createdAt: -1 });

    // Return the list of tweets (even if empty array, it's a valid 200 response)
    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

// 3. Update an existing tweet
const updateTweet = asyncHandler(async (req, res) => {
    // Get tweetId from params and new content from body
    const { tweetId } = req.params;
    const { content } = req.body;

    // Validation: tweetId must be a valid ObjectId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    // Validation: content must not be empty
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content cannot be empty");
    }

    // Find the tweet in database
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Authorization check: only the tweet owner can update it
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet");
    }

    // Update the content and save
    tweet.content = content.trim();
    const updatedTweet = await tweet.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

// 4. Delete a tweet
const deleteTweet = asyncHandler(async (req, res) => {
    // Get tweetId from URL parameters
    const { tweetId } = req.params;

    // Validation: tweetId must be a valid ObjectId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    // Find the tweet in database
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Authorization check: only the tweet owner can delete it
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    // Delete the tweet from database
    await Tweet.findByIdAndDelete(tweetId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
};
