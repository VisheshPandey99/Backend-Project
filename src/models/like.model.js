import mongoose ,{Schema} from "mongoose";
import { Comment } from "./comment.model";

const LikeSchema =new Schema({
    video:{
        type:Schema.Types.ObjectId,
        ref:"video"
    },
     Comment:{
        type: Schema.Types.ObjectId,
        ref:"Comment"
    },
     Tweet:{
        type:Schema.Types.ObjectId,
        ref:"Tweet"
    },
     LikeBy:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },


},{timestamps:true})

export const Like =mongoose.model("Like",LikeSchema)



