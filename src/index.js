// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";

import connectDB from "./db/index.js";


dotenv.config(
    {
        
        path: "./.env" 

    });

connectDB()

.then(()=> {
    app.listen(process.env.PORT||3000, () => {
        console.log(`server is running on port ${process.env.PORT||3000}`);
})    })  
 
.catch((error) => {
    console.log("MONGODB connection error:", error);

});  


// import express from "express";

// const app = express();

// (async() => {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on("error", (err) => {
//             console.error("ERROR", err)
//             throw err
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`Server is running on port ${process.env.PORT}`)
//         })

//     } catch(error){
//         console.error("ERROR", error)
//         throw error
//     }   

// })()