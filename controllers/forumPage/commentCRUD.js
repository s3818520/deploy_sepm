var commentModel = require('../../models/comment').comment;
var { uploadFile, deleteFile } = require('../s3')

var mongoose = require('mongoose');
const bucketName = "csfunctions-web-app/commentUploads"

exports.addComment = async function (req, res) {

    // console.log(req.body);
    // console.log(req.file);

    if (req.file) {
        const file = req.file;

        const result = await commentModel.create({

            images: 'commentUploads/' + req.file.filename + '.' + req.file.mimetype.split('/')[1],
            post_id: req.body.post_id,
            content: req.body.content,
            user_id: req.body.user_id

        })


        const s3Res = await uploadFile(file, bucketName);


        if (result && s3Res) {
            commentModel.aggregate([
                { $match: { post_id: mongoose.Types.ObjectId(req.body.post_id) } },
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "users"
                    }
                },
                {
                    $project: {
                        user_id: 1,
                        post_id: 1,
                        content: 1,
                        images: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        "users.name": 1,
                        "users.username": 1,
                        "users.avatar": 1
                    }
                },
                { $sort: { createdAt: -1 } }

            ]).exec((error, data) => {
                if (error) {
                    console.log(error)
                    return res.send([])
                } else {
                    console.log(data)
                    return res.send(data)
                }
            })
            // .sort({ 'createdAt': 'desc' })
        }



    } else {

        commentModel.create({
            post_id: req.body.post_id,
            content: req.body.content,
            user_id: req.body.user_id
        }, function (err, result) {
            if (err) {
                console.log(err)
            }

            console.log(result)
            res.send(result)

        })
    }

}

exports.editComment = function (req, res) {

    // console.log("Edit comment")
    // console.log(req.file)
    if (req.file) {
        const file = req.file;

        //Get the file of current image
        commentModel.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, async function (error, result) {

            console.log("Found comment")
            if (result) {
                //Remove current image from storage 
                deleteFile(result.images, bucketName);

                //Replacing with new image
                const updateResult = await commentModel.findByIdAndUpdate({ _id: mongoose.Types.ObjectId(req.body._id) }, {
                    images: 'commentUploads/' + req.file.filename + '.' + req.file.mimetype.split('/')[1],
                    content: req.body.content,

                })

                const s3Res = await uploadFile(file, bucketName);


                if (updateResult && s3Res) {
                    commentModel.aggregate([
                        { $match: { post_id: mongoose.Types.ObjectId(req.body.post_id) } },
                        {
                            $lookup: {
                                from: "users",
                                localField: "user_id",
                                foreignField: "_id",
                                as: "users"
                            }
                        },
                        {
                            $project: {
                                user_id: 1,
                                post_id: 1,
                                content: 1,
                                images: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                "users.name": 1,
                                "users.username": 1,
                                "users.avatar": 1
                            }
                        },
                        { $sort: { createdAt: -1 } }

                    ]).exec((error, data) => {
                        if (error) {
                            console.log(error)
                            return res.send([])
                        } else {
                            console.log(data)
                            return res.send(data)
                        }
                    })
                    // .sort({ 'createdAt': 'desc' })
                }
            } else {
                console.log(error)
            }
        })



    } else {

        commentModel.findByIdAndUpdate({ _id: mongoose.Types.ObjectId(req.body._id) }, {
            content: req.body.content,

        }, (error, result) => {
            if (error) {
                console.log(error)
            } else {
                console.log(result)
                res.send(result)
            }
        })

    }


}

exports.deleteComment = function (req, res) {

    commentModel.findOneAndDelete({
        _id: mongoose.Types.ObjectId(req.params)
    }, function (err, result) {
        if (err) {
            console.log(err)
        }

        if (result.images) {
            deleteFile(result.images, bucketName)
        }

        // console.log(result)
        res.send("Deleted")

    })

}

