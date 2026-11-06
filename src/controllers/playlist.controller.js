import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 1. Create a new playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name || name.trim() === "" || !description || description.trim() === "") {
        throw new ApiError(400, "Playlist name and description are required");
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        videos: [],
        owner: req.user?._id
    });

    if (!playlist) {
        throw new ApiError(500, "Failed to create playlist");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

// 2. Get all playlists of a specific user
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const playlists = await Playlist.find({ owner: userId }).sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
});

// 3. Get single playlist by ID (with videos and owners populated)
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId)
        .populate({
            path: "videos",
            populate: {
                path: "owner",
                select: "username fullname avatar"
            }
        })
        .populate("owner", "username fullname avatar");

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

// 4. Add a video to a playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }

    // Verify video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Authorization: only the playlist owner can add videos
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to add videos to this playlist");
    }

    // Prevent duplicate videos in the same playlist
    if (playlist.videos.some((v) => v.toString() === videoId.toString())) {
        throw new ApiError(400, "Video is already in this playlist");
    }

    playlist.videos.push(videoId);
    const updatedPlaylist = await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
});

// 5. Remove a video from a playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Authorization: only the playlist owner can remove videos
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to remove videos from this playlist");
    }

    // Check if the video is in the playlist
    if (!playlist.videos.some((v) => v.toString() === videoId.toString())) {
        throw new ApiError(404, "Video is not in this playlist");
    }

    // Remove the video
    playlist.videos = playlist.videos.filter((v) => v.toString() !== videoId.toString());
    const updatedPlaylist = await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));
});

// 6. Update playlist details (name or description)
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    if (!name && !description) {
        throw new ApiError(400, "Name or description is required to update");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Authorization: only the playlist owner can update it
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist");
    }

    if (name && name.trim() !== "") {
        playlist.name = name.trim();
    }

    if (description && description.trim() !== "") {
        playlist.description = description.trim();
    }

    const updatedPlaylist = await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
});

// 7. Delete a playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Authorization: only the playlist owner can delete it
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};
