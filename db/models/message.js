let mongoose = require('mongoose');

let messageModel = mongoose.model('messages', {
  sender: {
    type:String
  },
  receiver:{
      type:String
  },
  message:{
      type:String
  } 
});
module.exports=messageModel;
    