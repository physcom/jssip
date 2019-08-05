$(document).ready(function(){

var configuration = {
  'uri': 'sip:6001@10.111.69.144', // FILL SIP URI HERE like sip:sip-user@your-domain.bwapp.bwsip.io
  'password': '6001', // FILL PASSWORD HERE,
  'ws_servers': 'ws://10.111.69.144:8088/ws'
};

var incomingCallAudio = new window.Audio('./static/incoming-call-ringtone.mp3');
incomingCallAudio.loop = true;
var remoteAudio = new window.Audio();
remoteAudio.autoplay = true;

var callOptions = {
  mediaConstraints: {audio: true, video: false}
};

var phone;
if(configuration.uri && configuration.password){
    JsSIP.debug.enable('JsSIP:*'); // more detailed debug output
    socket = new JsSIP.WebSocketInterface("ws://10.111.69.144:8088/ws");
    configuration.sockets = [socket];
    phone = new JsSIP.UA(configuration);
    phone.on('registrationFailed', function(ev){
        alert('Registering on SIP server failed with error: ' + ev.cause);
      configuration.uri = null;
      configuration.password = null;
      updateUI();
    });
    phone.on('newRTCSession',function(ev){
        var newSession = ev.session;
        if(session){ // hangup any existing call
            session.terminate();
        }
        session = newSession;
        var completeSession = function(){
                session = null;
            updateUI();
        };
        session.on('ended', completeSession);
        session.on('failed', completeSession);
        session.on('accepted',updateUI);
        session.on('confirmed',function(){
            var localStream = session.connection.getLocalStreams()[0];
          var dtmfSender = session.connection.createDTMFSender(localStream.getAudioTracks()[0])
          session.sendDTMF = function(tone){
            dtmfSender.insertDTMF(tone);
          };
          updateUI();
        });
        session.on('addstream', function(e){
          incomingCallAudio.pause();
          remoteAudio.src = window.URL.createObjectURL(e.stream);
        });
        if(session.direction === 'incoming'){
            incomingCallAudio.play();
        }
        updateUI();
    });
    phone.start();
}

var session;
updateUI();



$('#connectCall').click(function () {
    var dest = $('#toField').val();
    phone.call(dest, callOptions);
    updateUI();
});


$('#answer').click(function(){
    console.log("answer button clicked");
    session.answer(callOptions);
});

var hangup = function(){
    console.log('HANGUP CLICKED');
    session.terminate();
};

$('#hangUp').click(hangup);
$('#reject').click(hangup);

$('#mute').click(function(){
    console.log('MUTE CLICKED');
    if(session.isMuted().audio){
        session.unmute({audio: true});
    }else{
        session.mute({audio: true});   
    }
    updateUI();
});
$('#toField').keypress(function(e){
    if(e.which === 13){//enter
        $('#connectCall').click();
    }
});
$('#inCallButtons').on('click', '.dialpad-char', function (e) {
    var $target = $(e.target);
    var value = $target.data('value');
    session.sendDTMF(value.toString());
});
function updateUI(){
    console.log("in updateUI");
    if(configuration.uri && configuration.password){
        console.log("looks in");
        $('#errorMessage').hide();
        $('#wrapper').show();
        if(session){
            if(session.isInProgress()){
                if(session.direction === 'incoming'){
                    $('#incomingCallNumber').html(session.remote_identity.uri);
                    $('#incomingCall').show();
                    $('#callControl').hide()  
                    $('#incomingCall').show();
                }else{
                    $('#callInfoText').html('Ringing...');
                    $('#callInfoNumber').html(session.remote_identity.uri.user);
                    $('#callStatus').show();                   
                }
                
            }else if(session.isEstablished()){
                $('#callStatus').show();
                $('#incomingCall').hide();
                $('#callInfoText').html('In Call');
                $('#callInfoNumber').html(session.remote_identity.uri.user);
                $('#inCallButtons').show();
                incomingCallAudio.pause();
            }
            $('#callControl').hide();
        }else{
            $('#incomingCall').hide();
            $('#callControl').show();
            $('#callStatus').hide();
            $('#inCallButtons').hide();
            incomingCallAudio.pause();
        }
        //microphone mute icon
        if(session && session.isMuted().audio){
            $('#muteIcon').addClass('fa-microphone-slash');
            $('#muteIcon').removeClass('fa-microphone');
        }else{
            $('#muteIcon').removeClass('fa-microphone-slash');
            $('#muteIcon').addClass('fa-microphone');
        }
    }else{
        $('#wrapper').hide();
        $('#errorMessage').show();
    }
}
$('#logout').click(function(){
    console.log('LOGOUT CLICKED');
    if(session){
        // закрываем всё нафиг, вылогиниваемся из астера, закрываем коннект
        this._ua.stop();
    }
    else{
        console.log("No session avaialable");
    }
    
});

});