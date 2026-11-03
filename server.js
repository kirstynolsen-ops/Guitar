const {createApplication}=require('./backend');
createApplication().then(({app})=>{const port=process.env.PORT||3000;app.listen(port,'0.0.0.0',()=>console.log('Guitar classroom running on port '+port));}).catch(()=>{console.error('Could not initialize Guitar Studio. Check APP_URL and DATA_DIR configuration and disk access.');process.exitCode=1;});
