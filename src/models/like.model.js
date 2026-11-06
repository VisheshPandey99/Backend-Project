import mongoose, { Schema } from "mongoose";

const LikeSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        // Preserving capitalized fields for compatibility
        Comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        },
        Tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        LikeBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

export const Like = mongoose.model("Like", LikeSchema);



