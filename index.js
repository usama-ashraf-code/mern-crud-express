// requires
const express = require('express')
const path = require('path');
const fs = require('fs');
const formidable = require("formidable");
const {MongoClient, ObjectId} = require("mongodb"); 


// express server/PORT
const app = express()
const PORT = 3000;

// Mongodb
const url = 'mongodb://localhost:27017'
const client = new MongoClient(url);
const DATABASE = "mongo-crud"
const COLLECTION = "students"

async function ConnectToDatabase(){
    try{
        await client.connect();
        console.log("connected to database");
    }
    catch(err){
        console.log(err);
    }
}
ConnectToDatabase();
    
// Middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname , "public")));
app.set("view engine" , 'ejs');
app.use("/uploads" , express.static(path.join(__dirname , "uploads")))


app.get("/" , (req,res)=>{
    res.render("Form");
})

app.post("/register" , (req,res)=>{
    const form = new formidable.IncomingForm();
    form.parse(req, async (err,fields,files)=>{
        if(err){
            console.log(err);
            return
        }
        const name = fields.name[0];
        const email = fields.email[0];
        const course = fields.course[0];
        const originalFilename = files.image[0].originalFilename;
        const filepath = files.image[0].filepath;
        const extension = originalFilename.split(".").pop();

        const collection = client.db(DATABASE).collection(COLLECTION);
        
        const userFound = await collection.findOne({email:email})

        if(userFound){
            res.send("User with this email already exist!")
            return
        }
        const result = await collection.insertOne({
            name:name,
            email:email,
            course:course,
            image:originalFilename
        })

        const insertedId = result.insertedId.toString();
        const newFilename = `${insertedId}.${extension}`
        
        
        const uploadDir = (path.join(__dirname , "uploads"))
        if(!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }

        const newFilepath = path.join(uploadDir , newFilename);
        fs.copyFile(filepath , newFilepath , (copyerr)=>{
            if(copyerr){
                res.send("Failed to copy file!");
                return
            }

            fs.unlink(filepath , (unlinkErr)=>{
                 if(unlinkErr){
                     console.log(unlinkErr);
                 }
            })
        })
        res.redirect("/")
    })
    

});

app.get("/show-students" , async (req,res)=>{
    const collection = client.db(DATABASE).collection(COLLECTION);
    const users = await collection.find({}).toArray();
    
    res.render("showStudents" , {users})
})


app.post("/delete" , async(req,res)=>{
    const id = req.body.id
    const collection = client.db(DATABASE).collection(COLLECTION);
    const userFound = await collection.findOne({_id: new ObjectId(id)})
    
    const userImageExtension = userFound.image.split('.').pop();
    const userImage = `${id}.${userImageExtension}`
    
    const imagePath = path.join(__dirname , "uploads" , userImage)
    fs.unlink(imagePath , (unlinkErr)=>{
        if(unlinkErr){
            console.log(unlinkErr);
        }
    })

    const result = collection.deleteOne({_id: new ObjectId(id)});
    


    res.redirect("/show-students");
})

app.post("/edit" , async (req,res)=>{
    const id = req.body.id;
    const collection = client.db(DATABASE).collection(COLLECTION);
    const userFound = await collection.findOne({_id : new ObjectId(id)});
    

   res.render("Edit" , {userFound})
})

app.post("/update-student" ,  (req,res)=>{
    const form = new formidable.IncomingForm();
    form.parse(req, async (err,fields,files)=>{
        if(err){
            console.log(err);
            return
        }
        const name = fields.name[0];
        const email = fields.email[0];
        const course = fields.course[0];
        const originalFilename = files.image[0].originalFilename;
        const filepath = files.image[0].filepath;
        const extension = originalFilename.split(".").pop();
        const id = fields.id[0];

        const collection = client.db(DATABASE).collection(COLLECTION);
        const userFound = await collection.findOne({_id : new ObjectId(id)});

        const oldUserImageExtension = userFound.image.split('.').pop();
        const OldUserImageName = `${id}.${oldUserImageExtension}`
       
        const oldUserImagePath = path.join(__dirname , "uploads" , OldUserImageName)
        
        const newUserImageExtension = originalFilename.split('.').pop();
        const newUserImageName = `${id}.${newUserImageExtension}`
        
        const newUserImagePath = path.join(__dirname , "uploads" , newUserImageName);
        fs.copyFile(filepath , newUserImagePath , async (copyerr)=>{
         if(copyerr){
            console.log(copyerr);
         }
         fs.unlink( oldUserImagePath , (unlinkErr)=>{
           if(unlinkErr){
              console.log(unlinkErr);
          }
           })

         const data = { name , email , course , image:newUserImageName};
         
         const result = await collection.updateOne({_id : new ObjectId(id) } , {$set: data} )
        
         res.redirect("/show-Students") 
        })

       
        
    })
    
  
});




app.listen(PORT , ()=>{
      console.log(`app is listening on port ${PORT}`);
})
