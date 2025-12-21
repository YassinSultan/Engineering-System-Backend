import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";


const ownerEntitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    createBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

ownerEntitySchema.plugin(mongoosePaginate);
export default mongoose.model("OwningEntity", ownerEntitySchema);