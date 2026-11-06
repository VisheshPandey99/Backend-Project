import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    // Return a simple 200 OK response to confirm the server is running healthy
    return res
        .status(200)
        .json(new ApiResponse(200, { status: "OK" }, "Health check passed successfully"));
})

export {
    healthcheck
    }
    