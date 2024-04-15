const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const cors = require('cors')
const path = require('path')

//database connection
mongoose.connect('mongodb+srv://dhinakaran:9943482529malai@cluster0.aok3wxj.mongodb.net/e-commerce').then(() => console.log('MongoDB Database Connected!'));

const app = express()
const PORT = process.env.PORT || 4000
app.use(express.json());
app.use(cors());

//multer config
const storage = multer.diskStorage({
   destination:'./upload/images',
   filename:(req, file, cb) => {
      return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)  }
   })
const upload = multer({storage:storage})

app.use('/images', express.static('upload/images'))

//upload endpoint
app.post('/upload', upload.single('product'),(req, res) => {
   res.json({
      success:true,
      image_url: `https://dkshop-ecommerceapi.onrender.com/images/${req.file.filename}`
   })
})


//schema
const productSchema = new mongoose.Schema({
   id:{
      type:Number,
      required:true,
   },
   name:{
      type:String,
      required:true,
   },
   image:{
      type:String,
      required:true,
   },
   category:{
      type:String,
      required:true,
   },
   new_price:{
      type:Number,
      required:true,
   },
   old_price:{
      type:Number,
      required:true,
   },
   date:{
      type:Date,
      default:Date.now,
   },
   avilable:{
      type:Boolean,
      default:true,
   },
})
const Product = mongoose.model("Product", productSchema)
/* const user = new Product({name:"dk"}) */
/* user.save() */
//console.log(Product.find());


app.post('/addproduct',async (req, res) => {   
   console.log("backend"+req.body.name);
   const allProduct = await Product.find()
   let id 
   if(allProduct.length>0){
      let last_product = allProduct.slice(-1)
      const product = last_product[0]
      id = product.id+1
   }else{
      id=1
   }
   // console.log('name:'+req.body.name);
   // console.log('image:'+req.body.imag);
   // console.log('category:'+req.body.category);
   // console.log('new_price:'+req.body.new_price);
   // console.log('old_price:'+req.body.old_price);
   const product = new Product({
      id:id,
      name:req.body.name,
      image:req.body.image,
      category:req.body.category,
      new_price:req.body.new_price,
      old_price:req.body.old_price
   })
   console.log(product);
   await product.save()
   res.json({
      success:true,
      name:req.body.name,
   })
})

//delete the product
app.post('/removeproduct', async(req, res) => {
   const product = await Product.findOneAndDelete({id:req.body.id})
   console.log(product);
   res.json({
      success:true,
      name:`${product.name} is deleted` 
   })
})

//display all product
app.get('/allproduct', async(req, res)=>{
   const product = await Product.find()   
   res.send(product)
})


app.get('/',(req, res) => {
   res.send("express running on port ")
})

//new collection product
app.get('/newcollections', async(req, res) => {
   let products = await Product.find({})
   let newCollection = products.slice(1).slice(-8)
   res.send(newCollection)
})
//popular end point 
app.get('/popularinwomen', async(req, res) => {
   let products = await Product.find({category:"women"})
   let popular = products.slice(0,4)  
   res.send(popular)
})

//schema for user
const userSchema = mongoose.Schema({
   username:{
      type:String
   },
   email:{
      type:String,
      unique:true,
   },
   password:{
      type:String,
      required:true,
   },
   cartData:{
         type:Object,
   },
   date:{
      type:Date,
      default:Date.now,
   },
})
const Users = mongoose.model('User', userSchema)

//create endpoint for user
app.post('/signup', async (req, res) => {
   let check = await Users.findOne({email:req.body.email})
   if(check){
      return res.status(400).json({
         success:false,
         errors:"Existing user found with same mail id "
      })
   }
   let cart = {}
   for (let index = 0; index < 300; index++) {
      cart[index]=0;      
   }
   const user = new Users({
      username:req.body.username,
      email:req.body.email,
      password:req.body.password,
      cartData:cart
   })
   await user.save()

   //JWT 
   const data ={
      user:{
         id:user.id
      }
   } 
   const token = jwt.sign(data, 'secret_ecom')
   res.json({success:true, token})

})
//login
app.post('/login', async (req, res) => {
   const user = await Users.findOne({email:req.body.email})
   if(user){      
      const passwordComp = user.password === req.body.password
      if(passwordComp){
         const data = {
            user:{
               id:user.id
            }
         }
         const token = jwt.sign(data, 'secret_ecom')
         res.json({success:true, token})
      }else{
         res.json({success:false, errors:"Incorrect password"})
      }
   }else{
      res.json({success:false, errors:"Incorrect mail id "})
   }
})

//middle ware for addtocart user
const fetchData = async (req, res, next) => {
   const token = req.header('auth-token');
   if(!token){
      res.status(401).send({errors:"Please authenticate using valid token"})
   }else{
      try {
         const data = jwt.verify(token,'secret_ecom')
         req.user = data.user;
         next()
      } catch (error) {
         res.status(401).send({errors:"Please authenticate using valid token"})         
      } 
   }    
}

//addtocart end point
app.post('/addtocart',fetchData,async (req, res) => {
   console.log(req.body, req.user);
   let userData = await Users.findOne({_id:req.user.id}) 
   console.log(userData);  
   userData.cartData[req.body.e] +=1
   console.log(userData.cartData);
   await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
   res.send("added")    
})

//remove from cart end point
app.post('/removefromcart',fetchData,async(req, res) => {
   console.log(req.body, req.user);
   let userData = await Users.findOne({_id:req.user.id}) 
   if(userData.cartData[req.body.e]>0){
   userData.cartData[req.body.e] -=1
   console.log(userData.cartData);
   await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
   }
   res.send("added")    
})
//get cart data
app.post('/getcartdata', fetchData, async(req, res) => {
   const cart = await Users.findOne({_id:req.user.id})
   res.json(cart.cartData)
})

app.listen(PORT, () => {
   console.log("server running on  PORT-4000");
})
