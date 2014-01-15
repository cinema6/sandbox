# C6Sandbox
C6Sandbox is a piece of middleware for [Connect](https://github.com/senchalabs/connect) that mimics the functionality of the [Cinema6 Website](https://github.com/cinema6/site). You can use the sandbox to develop and test your Cinema6 interactive video experiences against the Cinema6 API before you deploy to production.

## <a id="getting-started"></a>Getting Started Guide
In this example, we'll be using [Grunt](https://github.com/gruntjs/grunt) with the [grunt-contrib-connect](https://github.com/gruntjs/grunt-contrib-connect) task to fire up the sandbox server.

1. First you'll need to declare C6Sandbox as a devDependency in your ````package.json```` file.

		{
    		"name": "My-App",
		    "version": "0.0.0",
		    "devDependencies": {
		        "c6-sandbox": "cinema6/sandbox"
		    }
		}

2. Next, run ````npm install```` to install C6Sandbox.

3. Include the connect middleware

		var c6Sandbox = require('c6-sandbox');
		
4. Use the middleware

	There are quite a few things happening here. First, we're creating *two* Connect servers. The first one, app, is serving our application on port 9000. This technically has nothing to do with running the sandbox. The second one, sandbox, is what starts the sandbox on port 8000. As you can see, the c6Sandbox module is a function that *returns* connect middleware and *accepts* a configuration object. In the above example, we are setting up the sandbox with only one possible experience to send to your application. (You can pass in many experiences, but the first experience in the array will be used by default. For information on selecting a different experience, please see the [Sandbox Console API](#console-api).) Finally, we create a task, server, to serve our application and the sandbox.
	
	*Note*: In this example, we've declared our mock experiences in the Gruntfile. This isn't so terrible when there's only one experience with minimal data, but if you have many experiences, it'd probably be better to put the array in a JSON file and import it with ````grunt.file.readJSON()````.

		grunt.initConfig({
			connect: {
				// Connect server to serve your app
				app: {
					options: {
						port: 9000,
						hostname: '0.0.0.0',
						middleware: function() {
							return [
								// Whatever middleware you need to serve your app (without the sandbox)
							];
						}
					}
				},
				// Connect server to serve the sandbox
				sandbox: {
					options: {
						port: 8000,
						hostname: '0.0.0.0',
						keepalive: true,
						middleware: function() {
							return [
								// This is where you use the sandbox middleware
								c6Sandbox({
									experiences: [
										{
											id: '8fb3y89', // Doesn't matter what it is. Fake it.
											uri: 'myapp',
											appUrl: 'http://localhost:9000/' // IMPORTANT! The address of your app. This is what will be iframed in.
										}
									]
								})
							];
						}
					}
				}
			}
		});
		
		grunt.registerTask('server', [
			'connect:app',
			'connect:sandbox'
		]);

5. Run ````grunt server```` and point your browser to ````http://localhost:8000/```` to see your app running in the sandbox.

##<a id="console-api"></a> Sandbox Console API
The C6Sandbox includes an API that is meant to be used from your browser's Javascript console. You can use this API to change how the sandbox will respond to your application.

### getExperiences()
**accepts**: *none*  
**returns**: Array

This method returns an array of the experience objects you configured when setting up the Connect middleware. See the [Getting Started Guide](#getting-started) for an example of how to configure the middleware with some experiences.

### getCurrentExperience()
**accepts**: *none*  
**returns**: [Object Experience]

This method returns the experience object currently being handed to the site (in the appData.) By default, it is the first experience in the array of provided experiences.

### setCurrentExperience(index)
**accepts**: *Number* index  
**returns**: [Object Experience]

This method sets the current experience to the experience object at the provided index of the experience array.

### clear()
**accepts**: *none*  
**returns**: *none*

This method resets the Sandbox settings to their default.

### getSpeed()
**accepts**: *none*  
**returns**: String

This method returns the speed (connection) that the sandbox will give to your application through the profile. By default, it is "fast".

### setSpeed(speed)
**accepts**: *String* speed  
**returns**: String

This method sets the speed that will be sent in the device profile to your application.

### getDubUrl()
**accepts**: *none*  
**returns**: String

This method returns the Dub URL the sandbox will give to the experience on the appData object.

### setDubUrl(speed)
**accepts**: *String* speed  
**returns**: String

This method sets and returns the Dub URL the sandbox will give to the experience on the appData object.

### getEmbedMode()
**accepts**: *none*  
**returns**: Boolean

This method returns true if the sanbox is in embed mode and false if it is not.

### setEmbedMode(bool)
**accepts**: *Boolean* bool  
**returns**: Boolean

This method sets whether or not the sandbox is in embed mode.

### getEmbedSize()
**accepts**: *none*  
**returns**: Object

This method returns the dimensions of the embed iframe as an object.

### setEmbedSize(dimensions)
**accepts**: *String* dimensions  
**returns**: Boolean

This method sets the dimensions of the embed iframe as a string. For example: to set the iframe to 100% wide by 500px tall, call the method like this:
```javascript
c6Sandbox.setEmbedSize('100%x500');
```