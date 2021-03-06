// Author: Simon J. Hogan
// Modifed: 24/04/2016
// Sith'ari Consulting Australia
// --------------------------------------------

function Player() {
	var item;
	var playStopped;
	var myTimer;
};
Player.prototype.load = function(data, settings) {
	settings = settings || {};
	var self = this;
	self.playStopped = false;
	prefs.myTimer = null;
	item = data;
	var time = 0;
	if (true) {  //for now, just assume its a video item				
		dom.append("body", {
			nodeName: "div",
			className: "player",
			id: "player",
			childNodes: [{
				nodeName: "video",
				className: "video",
				id: "video"
			    },{
					nodeName: "div",
					id: "video-controls",
					className: "video-controls",
					childNodes: [{
					    nodeName: "button",
					    className: "play",
					    id: "play-pause",
					    text: "Pause"
				    }, {
						nodeName: "button",
						className: "stop",
						id: "stop-exit",
						text: "Stop"
				    }, {
						nodeName: "button",
						className: "info-button",
						id: "info-button",
						text: "0:00/0:00"
				    }, {
					    nodeName: "input",
					    "type": "range",
					    className: "seek-bar",
					    id: "seek-bar",
					    "value": "0",
				    }]
			    }]
		});	
		var node = dom.querySelector("#video");
		node.setAttribute("crossorigin", "anonymous")
		node.setAttribute("webkit-playsinline","")
		node.setAttribute("playsinline","")
		node.setAttribute("autoplay","autoplay")
		node.setAttribute("preload","metadata")
		if (prefs.isLiveTvItem)
        {	

			prefs.mimeType = "m3u8"
          	
       	    dom.append("#video", {
			    nodeName: "source",
			    src: emby.getLiveTvHlsStreamUrl({
				    itemid: item.Id,					
			        liveStreamId: prefs.liveStreamId,
			        mediaSourceId: prefs.mediaSourceId,
			        playSessionId: prefs.playSessionId
			    }),
			    "type": mime.lookup(prefs.mimeType)
		    });
	    }
		else
        if (prefs.directPlay == true)
        {	
          	prefs.mimeType = "mp4"
          	
       	    dom.append("#video", {
			    nodeName: "source",
			    src: emby.getVideoStreamUrl({
				    itemId: item.Id,					
			        mediaSourceId: item.MediaSources[0].Id,
			    }),
			    "type": mime.lookup(prefs.mimeType)
		    });
		    
	    }
        else
        {
        	prefs.mimeType = "m3u8"
        	dom.append("#video", {
			    nodeName: "source",
		        src: emby.getVideoHlsStreamUrl({
			        itemId: item.Id,
			        mediaSourceId: item.MediaSources[0].Id
		        }),
		        "type": mime.lookup(prefs.mimeType)
		    });
        }
		var video = document.getElementById("video");
		

// check subtitle availability

       	prefs.subtitleAvailable = false;
       	if (typeof item.MediaSources[0].DefaultSubtitleStreamIndex != 'undefined')
       	{	   
          prefs.subtitleAvailable = true
    	  dom.append("#video", {
    	     nodeName: "track",
     	     "kind": "subtitles",
    	     src: emby.getVideoSubtitleData({
    	         itemId: item.Id,
    	         mediaSourceId: item.MediaSources[0].Id,
    	         mediaSourceIndex: item.MediaSources[0].DefaultSubtitleStreamIndex
    	     })
          });
    	  video.textTracks[0].mode = 'showing'
       	}

		var playerRegion = document.getElementById("player");		
		var playButton = document.getElementById("play-pause");
		var stopButton = document.getElementById("stop-exit");
		var infoButton = document.getElementById("info-button");
		var seekBar = document.getElementById("seek-bar");

		video.addEventListener("playing", function(event) {
			time = Math.floor(event.target.currentTime);	
			var ticks = time * 10000000;

			emby.postSessionPlayingStarted({
				data: {
					ItemId: item.Id,
					MediaSourceId: item.Id,
					QueueableMediaTypes: "video",
					CanSeek: true,
					PositionTicks: ticks,
					PlayMethod: "DirectStream"
				},
				success: success,
				error: error
			});
							
		});
		
		video.addEventListener("ended", function(event) {
			history.back();
		});
	
		video.addEventListener("waiting", function(event) {
			if (!prefs.isLiveTvItem)
				return;
			if (prefs.playerSkipped){
				prefs.playerSkipped = false;
				return;
			}
			if (prefs.spinnerTimer != null)
				window.clearTimeout(prefs.spinnerTimer)
			dom.show('#spinnerBackdrop')
			prefs.spinnerTimer = window.setTimeout(function(){
				dom.hide('#spinnerBackdrop')
				prefs.spinnerTimer = null;
			},8000)
		})
		video.addEventListener("timeupdate", function(event) {
			// update the time/duration and slider values
			if (video.currentTime == 0 || self.playStopped)
				return;
			prefs.videoDuration = video.duration;
			var durhr = Math.floor(prefs.videoDuration / 3600);
		    var durmin = Math.floor((prefs.videoDuration % 3600) / 60);
			durmin = durmin < 10 ? '0' + durmin : durmin;
				
			var curhr = Math.floor(video.currentTime / 3600);
		    var curmin = Math.floor((video.currentTime % 3600) / 60);
			curmin = curmin < 10 ? '0' + curmin : curmin;

			infoButton.innerHTML = curhr+":"+curmin+"/"+durhr+ ":"+durmin; 
			seekBar.value = (100 / prefs.videoDuration) * video.currentTime;

			if (Math.floor(video.currentTime) > time + 4) {
				time = Math.floor(event.target.currentTime);	
				var ticks = time * 10000000;
				
				prefs.itemId = item.Id;
				prefs.ticks = ticks;
                if (prefs.isLiveTvItem)
            		emby.postSessionPlayingProgress({
            			data: {
            				ItemId: prefs.itemId,
            				mediaSourceId: prefs.liveStreamId.substring(prefs.liveStreamId.indexOf("native")),
            				QueueableMediaTypes: "video",
            				EventName: "timeupdate",
            				BufferedRanges: [{start: 0, end: 989885539.9999999}],
            		        LiveStreamId: prefs.liveStreamId,
            		        playSessionId: prefs.playSessionId,
            				CanSeek: true,
            				IsPaused: true,
            				PositionTicks: prefs.ticks,
            				PlayMethod: "DirectStream"
            			},
            			success: success,
            			error: error
            		});
                else
				   emby.postSessionPlayingProgress({
					   data: {
						   ItemId: item.Id,
						   MediaSourceId: item.Id,
						   QueueableMediaTypes: "video",
						   CanSeek: true,
						   PositionTicks: ticks,
						   PlayMethod: "DirectStream"
					   },
					   success: success,
					   error: error
				   });
					

			}
		});
		video.onpause = function(event) {
			time = Math.floor(event.target.currentTime);	
			var ticks = time * 10000000;

			if (!self.playStopped)
			{
			   emby.postSessionPlayingProgress({
				   data: {
					   ItemId: item.Id,
					   MediaSourceId: item.Id,
					   QueueableMediaTypes: "video",
					   CanSeek: true,
					   PositionTicks: ticks,
					   PlayMethod: "DirectStream",
					   IsPaused: true
				   },
				   success: success,
				   error: error
			   });
			}
						
			console.log("Play Paused - " + time + " : " + ticks);
		};

		// Event listener for the play/pause button
		playButton.addEventListener("click", function() {
			if (video.paused == true) {
				// Play the video
				video.play();

				// Update the button text to 'Pause'
				playButton.innerHTML = "Pause";
				if (prefs.myTimer != null)
				   clearInterval(prefs.myTimer);
				prefs.myTimer = null
			} else {
				// Pause the video
				video.pause();

				// Update the button text to 'Play '
				playButton.innerHTML = "Play";
				if (prefs.isLiveTvItem)
				   prefs.myTimer = window.setInterval(postProgress, 9000);
			}
		});

		// Event listener for the stop button
		stopButton.addEventListener("click", function() {
			history.back();
		});

		// Event listener for the seek bar
		seekBar.addEventListener("change", function() {
			// Calculate the new time
			var time = prefs.videoDuration * (seekBar.value / 100);

			// Update the video time
			prefs.currentTime = time
			var durhr = Math.floor(prefs.videoDuration / 3600);
		    var durmin = Math.floor((prefs.videoDuration % 3600) / 60);
			durmin = durmin < 10 ? '0' + durmin : durmin;
				
			var curhr = Math.floor(prefs.currentTime / 3600);
		    var curmin = Math.floor((prefs.currentTime % 3600) / 60);
			curmin = curmin < 10 ? '0' + curmin : curmin;
			infoButton.innerHTML = curhr+":"+curmin+"/"+durhr+ ":"+durmin; 
		});

	
		// Pause the video when the seek handle is being dragged
		seekBar.addEventListener("mousedown", function() {
			video.pause();
			self.showControls({persist: true})
			emby.postActiveEncodingStop({
				success: success,
				error: error
			})
			playButton.innerHTML = "Play";
		});

		// Play the video when the seek handle is dropped
		seekBar.addEventListener("mouseup", function() {
			self.showControls({duration: 1000})
			prefs.currentTime = prefs.videoDuration * (seekBar.value / 100);
			if (prefs.directPlay == true || prefs.isLiveTvItem)
				video.currentTime = prefs.currentTime
			else
			{	
		        var options = {};
		        options.option = {};
		        options.option.transmission = {};
		        options.option.transmission.playTime = {};
		       	options.option.a3dMode = prefs.video3DFormat
		        options.option.transmission.playTime.start = prefs.currentTime*1000;

		        var str = escape(JSON.stringify(options))
		        str = str.replace("a3dMode","3dMode")
		        var node = dom.querySelector("source");
		        node.setAttribute('type',mime.lookup("m3u8")+';mediaOption=' +  str);
		        video.load();
			}
	        video.play();
			playButton.innerHTML = "Pause";
		});


		video.addEventListener("mousemove",function(){
			self.showControls({duration: 6000});
		});
		
        var options = {};
        options.option = {};
       	options.option.a3dMode = prefs.video3DFormat
		if (prefs.resumeTicks > 0)
		{
           //get seconds from ticks
		   var ts = prefs.resumeTicks / 10000000;
		   prefs.resumeTicks = 0;

		   //conversion based on seconds
		   var hh = Math.floor( ts / 3600);
		   var mm = Math.floor( (ts % 3600) / 60);
		   var ss = Math.floor(  (ts % 3600) % 60);

		   //prepend '0' when needed
		   hh = hh < 10 ? '0' + hh : hh;
		   mm = mm < 10 ? '0' + mm : mm;
		   ss = ss < 10 ? '0' + ss : ss;

  			   //use it
		   var str = hh + ":" + mm + ":" + ss;
		   playerpopup.show({
			   duration: 2000,
			   text: "Resuming Playback at " + str
		   });	
           options.option.transmission = {};
           options.option.transmission.playTime = {};
           options.option.transmission.playTime.start = Math.floor(ts) * 1000;
		}
        var str = escape(JSON.stringify(options))
        str = str.replace("a3dMode","3dMode")
		var node = dom.querySelector("source");
        node.setAttribute('type',mime.lookup(prefs.mimeType)+';mediaOption=' +  str);
		video.load();
		video.play();
	}
	function postProgress(){
		// update seekbar time values
		var infoButton = document.getElementById("info-button");
		var seekBar = document.getElementById("seek-bar");
		var video = document.getElementById("video");
		prefs.videoDuration = video.duration;
		var durhr = Math.floor(prefs.videoDuration / 3600);
	    var durmin = Math.floor((prefs.videoDuration % 3600) / 60);
		durmin = durmin < 10 ? '0' + durmin : durmin;
			
		var curhr = Math.floor(video.currentTime / 3600);
	    var curmin = Math.floor((video.currentTime % 3600) / 60);
		curmin = curmin < 10 ? '0' + curmin : curmin;

		infoButton.innerHTML = curhr+":"+curmin+"/"+durhr+ ":"+durmin; 
		seekBar.value = (100 / prefs.videoDuration) * video.currentTime;

		emby.postSessionPlayingProgress({
			data: {
				ItemId: prefs.itemId,
				mediaSourceId: prefs.liveStreamId.substring(prefs.liveStreamId.indexOf("native")),
				QueueableMediaTypes: "video",
				EventName: "timeupdate",
				BufferedRanges: [{start: 0, end: 989885539.9999999}],
		        LiveStreamId: prefs.liveStreamId,
		        playSessionId: prefs.playSessionId,
				CanSeek: true,
				IsPaused: true,
				PositionTicks: prefs.ticks,
				PlayMethod: "DirectStream"
			},
			success: success,
			error: error
		});
	}
	function success(data){
		return;
	}
	function error(data){
		return;
	}
};

Player.prototype.close = function(event) {
//	clearInterval(this.interval)
	var video = document.getElementById("video");
	var self = this
	self.playStopped = true;
	time = Math.floor(video.currentTime);	
	var ticks = time * 10000000;

	emby.postSessionPlayingStopped({
		success: stopEncoding,
		data: {
			ItemId: item.Id,
			MediaSourceId: item.Id,
			QueueableMediaTypes: "video",
			CanSeek: true,
			PositionTicks: ticks,
			PlayMethod: "DirectStream"
		}
	});	
	emby.postActiveEncodingStop({
		success: success,
		error: error
	})
	if (prefs.liveStreamId != null)
	   emby.postLiveStreamClose({
		   success: stopEncoding,
		   data: {
			   LiveStreamId: prefs.liveStreamId
		   }
	})
	if (prefs.myTimer != null)
		clearInterval(prefs.myTimer);
 
    dom.remove("#player");	
	dom.remove("#video-controls");
	dom.focus("#viewPlay")
	
	function stopEncoding(data){
		return;
	}
	function success(data){
		return;
	}
	function error(data){
		return;
	}
   	
};

Player.prototype.skip = function() {
	var video = document.getElementById("video");
	if (prefs.firstSkip)
	{
		prefs.firstSkip = false
		prefs.currentTime = video.currentTime
		prefs.skipTime = Math.floor(prefs.fwdSkip)
		emby.postActiveEncodingStop({
			success: success,
			error: error
		})
	}
	else
		prefs.skipTime += Math.floor(prefs.fwdSkip)
		
	//conversion based on seconds
	var ts = 0;
	if (prefs.skipTime < 0)
		ts = prefs.skipTime * -1
	else
		ts = prefs.skipTime
	var mm = Math.floor( (ts % 3600) / 60);
	var ss = Math.floor(  (ts % 3600) % 60);

	//prepend '0' when needed
	mm = mm < 10 ? '0' + mm : mm;
	ss = ss < 10 ? '0' + ss : ss;

	//use it
	var str = mm + ":" + ss;
	prefs.skipTime < 0 ? str = "Back skipping " + str : str = "Skipping " + str
	playerpopup.show({
		duration: 2000,
		text: str
	});	

	if (prefs.playerRestarting)
		return
	if (prefs.interval)
  	    window.clearTimeout(prefs.interval);
	prefs.interval = window.setTimeout(this.restartAt, 700);
	
	function success(data){
		return;
	}
	function error(data){
		return;
	}
};

Player.prototype.backskip = function() {
	var video = document.getElementById("video");
	if (prefs.firstSkip)
	{
		prefs.firstSkip = false
		prefs.currentTime = video.currentTime
		prefs.skipTime = Math.floor(prefs.backSkip * -1)
		emby.postActiveEncodingStop({
			success: success,
			error: error
		})
	}
	else
		prefs.skipTime -= Math.floor(prefs.backSkip)
		
	//conversion based on seconds
	var ts = 0;
	if (prefs.skipTime < 0)
		ts = prefs.skipTime * -1
	else
		ts = prefs.skipTime
	var mm = Math.floor( (ts % 3600) / 60);
	var ss = Math.floor(  (ts % 3600) % 60);

	//prepend '0' when needed
	mm = mm < 10 ? '0' + mm : mm;
	ss = ss < 10 ? '0' + ss : ss;

	//use it
	var str = mm + ":" + ss;
	prefs.skipTime < 0 ? str = "Back skipping " + str : str = "Skipping " + str
	playerpopup.show({
		duration: 2000,
		text: str
	});	

	if (prefs.playerRestarting)
		return
	if (prefs.interval)
  	    window.clearTimeout(prefs.interval);
	prefs.interval = window.setTimeout(this.restartAt, 700);
	function success(data){
		return;
	}
	function error(data){
		return;
	}
};

Player.prototype.restartAt = function(){

	prefs.playerRestarting = prefs.playerSkipped = true
	var restartPoint = Math.floor(prefs.currentTime + prefs.skipTime) * 1000
	if (restartPoint < 0)
	   restartPoint = 0;
	var video = document.getElementById("video");
    if (prefs.directPlay == true || prefs.isLiveTvItem)
    {
    	video.currentTime = Math.floor(prefs.currentTime + prefs.skipTime)
    }	
    else
    {    	
	    var options = {};
        options.option = {};
        options.option.transmission = {};
        options.option.transmission.playTime = {};
       	options.option.a3dMode = prefs.video3DFormat
        options.option.transmission.playTime.start = restartPoint;

        var str = escape(JSON.stringify(options))
        str = str.replace("a3dMode","3dMode")
        var node = dom.querySelector("source");
        node.setAttribute('type',mime.lookup("m3u8")+';mediaOption=' +  str);
        video.load();
        video.play();
    }
    if (prefs.restartInterval)
    	window.clearTimeout(prefs.restartInterval)
    prefs.restartInterval = window.setTimeout(function(){
        prefs.firstSkip = true;
    }, 1500)
    prefs.playerRestarting = false
}

Player.prototype.play = function() {
	var video = document.getElementById("video");
	var playButton = document.getElementById("play-pause");
	playButton.innerHTML = "Pause";
	video.play();
	if (video.playbackRate != 1)
	    video.playbackRate = 1;
	if (prefs.myTimer != null)
		clearInterval(prefs.myTimer);
	prefs.myTimer = null;
};
Player.prototype.pause = function() {
	var playButton = document.getElementById("play-pause");
	playButton.innerHTML = "Play";
	var video = document.getElementById("video");
	video.pause();
	if (prefs.isLiveTvItem)
       prefs.myTimer = window.setInterval(postProgress, 9000);
	
	
	function postProgress(){
		//update seekbar values
		var infoButton = document.getElementById("info-button");
		var seekBar = document.getElementById("seek-bar");
		var video = document.getElementById("video");
		prefs.videoDuration = video.duration;
		var durhr = Math.floor(prefs.videoDuration / 3600);
	    var durmin = Math.floor((prefs.videoDuration % 3600) / 60);
		durmin = durmin < 10 ? '0' + durmin : durmin;
			
		var curhr = Math.floor(video.currentTime / 3600);
	    var curmin = Math.floor((video.currentTime % 3600) / 60);
		curmin = curmin < 10 ? '0' + curmin : curmin;

		infoButton.innerHTML = curhr+":"+curmin+"/"+durhr+ ":"+durmin; 
		seekBar.value = (100 / prefs.videoDuration) * video.currentTime;

		emby.postSessionPlayingProgress({
			data: {
				ItemId: prefs.itemId,
				mediaSourceId: prefs.liveStreamId.substring(prefs.liveStreamId.indexOf("native")),
				BufferedRanges: [{start: 0, end: 989885539.9999999}],
		        liveStreamId: prefs.liveStreamId,
		        playSessionId: prefs.playSessionId,
		        QueueableMediaTypes: "video",
				EventName: "timeupdate",
				CanSeek: true,
				IsPaused: true,
				PositionTicks: prefs.ticks,
				PlayMethod: "DirectStream"
			},
			success: success,
			error: error
		});
	}
	function success(data){
		return;
	}
	function error(data){
		return;
	}
};
Player.prototype.fastforward = function() {
	var video = document.getElementById("video");
	video.playbackRate += .5;
	
	playerpopup.show({
		duration: 1000,
		text: "Fast Forward " + video.playbackRate + "x"
	});	

};
Player.prototype.rewind = function() {
	var video = document.getElementById("video");
	if (video.playbackRate > 0)
		video.playbackRate = 0;
	video.playbackRate -= .5;
	playerpopup.show({
		duration: 1000,
		text: "Rewind " + video.playbackRate* -1 + "x"
	});	
};
Player.prototype.showControls = function(settings){
	var duration = settings.duration || 3000;
	var persist = settings.persist || false;

	window.clearTimeout(this.interval);
	dom.show("#video-controls");
	if (!persist)
    	this.interval = window.setTimeout(function() {
		   dom.hide("#video-controls");
	    }, duration);

};
Player.prototype.hideControls = function(){
	dom.hide("#video-controls");
};
Player.prototype.showSubtitles = function(){
 	if (!prefs.subtitleAvailable)
 	{
		playerpopup.show({
			duration: 1000,
			text: "Subtitles not available"
		});	
	   return
 	}
 	var video = document.getElementById("video");
	video.textTracks[0].mode = 'showing'
	playerpopup.show({
		duration: 1000,
		text: "Subtitles Enabled"
	});	
}
Player.prototype.hideSubtitles = function(){
 	if (!prefs.subtitleAvailable)
 	{
		playerpopup.show({
			duration: 1000,
			text: "Subtitles not available"
		});	
 		return
 	}
 	var video = document.getElementById("video");
	video.textTracks[0].mode = 'hidden'
		playerpopup.show({
			duration: 1000,
			text: "Subtitles Disabled"
		});	
}