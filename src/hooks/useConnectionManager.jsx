
import { useState, useCallback, useRef, useEffect } from 'react';

// Use the deployed edge function for signaling
const SIGNALING_SERVER_URL = 'wss://pvcqfotzbntthdlmyefj.supabase.co/functions/v1/signaling-server';

export const useConnectionManager = ({ 
  onConnectionChange, 
  onDataChannelOpen,
  onMessage,
  onFileChunk,
  onPeerDisconnected
}) => {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
  const connectionRef = useRef(null);
  const signalingSocketRef = useRef(null);
  const roomIdRef = useRef(null);
  const roleRef = useRef(null);

  // Cleanup function to handle disconnection
  const handleDisconnection = useCallback(() => {
    console.log('Handling disconnection...');
    setConnectionStatus('Disconnected');
    setIsConnecting(false);
    setIsWaitingForConnection(false);
    onConnectionChange(false);
    
    if (connectionRef.current?.dataChannel) {
      connectionRef.current.dataChannel.close();
    }
    if (connectionRef.current?.peer) {
      connectionRef.current.peer.close();
    }
    connectionRef.current = null;
    
    if (signalingSocketRef.current) {
      signalingSocketRef.current.close();
      signalingSocketRef.current = null;
    }
    
    if (onPeerDisconnected) {
      onPeerDisconnected();
    }
  }, [onConnectionChange, onPeerDisconnected]);

  // Setup beforeunload event to handle tab close/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('Page unloading, sending disconnection signal...');
      if (connectionRef.current?.dataChannel?.readyState === 'open') {
        try {
          connectionRef.current.dataChannel.send(JSON.stringify({
            type: 'peer-disconnected',
            peerId: 'sender'
          }));
        } catch (error) {
          console.log('Failed to send disconnection message:', error);
        }
      }
      
      // Close connections
      if (connectionRef.current?.dataChannel) {
        connectionRef.current.dataChannel.close();
      }
      if (connectionRef.current?.peer) {
        connectionRef.current.peer.close();
      }
      if (signalingSocketRef.current) {
        signalingSocketRef.current.close();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  const createPeerConnection = useCallback(() => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun01.sipphone.com' },
        { urls: 'stun:stun.ekiga.net' },
        { urls: 'stun:stun.fwdnet.net' },
        { urls: 'stun:stun.ideasip.com' },
        { urls: 'stun:stun.iptel.org' },
        { urls: 'stun:stun.schlund.de' },
        { urls: 'stun:stunserver.org' },
        { urls: 'stun:stun1.l.gooun2.l.googlgle.com:19302' },
        { urls: 'stun:ste.com:19302' },
        { urls: 'stun:stun.ekiga.net' },
        { urls: 'stun:stun.ideasip.com' },
        { urls: 'stun:stun.rixtelecom.se' },
        { urls: 'stun:stun.schlund.de' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.voiparound.com' },
        { urls: 'stun:stun.voipbuster.com' },
        { urls: 'stun:stun.voipstunt.com' },
        { urls: 'stun:stun.voxgratia.or' },

        { urls: 'stun:s1.taraba.net:3478' },
        { urls: 'stun:s2.taraba.net:3478' },
        { urls: 'stun:stun.12connect.com:3478' },
        { urls: 'stun:stun.12voip.com:3478' },
        { urls: 'stun:stun.1und1.de:3478' },
        { urls: 'stun:stun.2talk.co.nz:3478' },
        { urls: 'stun:stun.2talk.com:3478' },
        { urls: 'stun:stun.3clogic.com:3478' },
        { urls: 'stun:stun.3cx.com:3478' },
        { urls: 'stun:stun.a-mm.tv:3478' },
        { urls: 'stun:stun.aa.net.uk:3478' },
        { urls: 'stun:stun.acrobits.cz:3478' },
        { urls: 'stun:stun.actionvoip.com:3478' },
        { urls: 'stun:stun.advfn.com:3478' },
        { urls: 'stun:stun.aeta-audio.com:3478' },
        { urls: 'stun:stun.aeta.com:3478' },
        { urls: 'stun:stun.alltel.com.au:3478' },
        { urls: 'stun:stun.altar.com.pl:3478' },
        { urls: 'stun:stun.annatel.net:3478' },
        { urls: 'stun:stun.antisip.com:3478' },
        { urls: 'stun:stun.arbuz.ru:3478' },
        { urls: 'stun:stun.avigora.com:3478' },
        { urls: 'stun:stun.avigora.fr:3478' },
        { urls: 'stun:stun.awa-shima.com:3478' },
        { urls: 'stun:stun.awt.be:3478' },
        { urls: 'stun:stun.b2b2c.ca:3478' },
        { urls: 'stun:stun.bahnhof.net:3478' },
        { urls: 'stun:stun.barracuda.com:3478' },
        { urls: 'stun:stun.bluesip.net:3478' },
        { urls: 'stun:stun.bmwgs.cz:3478' },
        { urls: 'stun:stun.botonakis.com:3478' },
        { urls: 'stun:stun.budgetphone.nl:3478' },
        { urls: 'stun:stun.budgetsip.com:3478' },
        { urls: 'stun:stun.cablenet-as.net:3478' },
        { urls: 'stun:stun.callromania.ro:3478' },
        { urls: 'stun:stun.callwithus.com:3478' },
        { urls: 'stun:stun.cbsys.net:3478' },
        { urls: 'stun:stun.chathelp.ru:3478' },
        { urls: 'stun:stun.cheapvoip.com:3478' },
        { urls: 'stun:stun.ciktel.com:3478' },
        { urls: 'stun:stun.cloopen.com:3478' },
        { urls: 'stun:stun.colouredlines.com.au:3478' },
        { urls: 'stun:stun.comfi.com:3478' },
        { urls: 'stun:stun.commpeak.com:3478' },
        { urls: 'stun:stun.comtube.com:3478' },
        { urls: 'stun:stun.comtube.ru:3478' },
        { urls: 'stun:stun.cope.es:3478' },
        { urls: 'stun:stun.counterpath.com:3478' },
        { urls: 'stun:stun.counterpath.net:3478' },
        { urls: 'stun:stun.cryptonit.net:3478' },
        { urls: 'stun:stun.darioflaccovio.it:3478' },
        { urls: 'stun:stun.datamanagement.it:3478' },
        { urls: 'stun:stun.dcalling.de:3478' },
        { urls: 'stun:stun.decanet.fr:3478' },
        { urls: 'stun:stun.demos.ru:3478' },
        { urls: 'stun:stun.develz.org:3478' },
        { urls: 'stun:stun.dingaling.ca:3478' },
        { urls: 'stun:stun.doublerobotics.com:3478' },
        { urls: 'stun:stun.drogon.net:3478' },
        { urls: 'stun:stun.duocom.es:3478' },
        { urls: 'stun:stun.dus.net:3478' },
        { urls: 'stun:stun.e-fon.ch:3478' },
        { urls: 'stun:stun.easybell.de:3478' },
        { urls: 'stun:stun.easycall.pl:3478' },
        { urls: 'stun:stun.easyvoip.com:3478' },
        { urls: 'stun:stun.efficace-factory.com:3478' },
        { urls: 'stun:stun.einsundeins.com:3478' },
        { urls: 'stun:stun.einsundeins.de:3478' },
        { urls: 'stun:stun.ekiga.net:3478' },
        { urls: 'stun:stun.epygi.com:3478' },
        { urls: 'stun:stun.etoilediese.fr:3478' },
        { urls: 'stun:stun.eyeball.com:3478' },
        { urls: 'stun:stun.faktortel.com.au:3478' },
        { urls: 'stun:stun.freecall.com:3478' },
        { urls: 'stun:stun.freeswitch.org:3478' },
        { urls: 'stun:stun.freevoipdeal.com:3478' },
        { urls: 'stun:stun.fuzemeeting.com:3478' },
        { urls: 'stun:stun.gmx.de:3478' },
        { urls: 'stun:stun.gmx.net:3478' },
        { urls: 'stun:stun.gradwell.com:3478' },
        { urls: 'stun:stun.halonet.pl:3478' },
        { urls: 'stun:stun.hellonanu.com:3478' },
        { urls: 'stun:stun.hoiio.com:3478' },
        { urls: 'stun:stun.hosteurope.de:3478' },
        { urls: 'stun:stun.ideasip.com:3478' },
        { urls: 'stun:stun.imesh.com:3478' },
        { urls: 'stun:stun.infra.net:3478' },
        { urls: 'stun:stun.internetcalls.com:3478' },
        { urls: 'stun:stun.intervoip.com:3478' },
        { urls: 'stun:stun.ipcomms.net:3478' },
        { urls: 'stun:stun.ipfire.org:3478' },
        { urls: 'stun:stun.ippi.fr:3478' },
        { urls: 'stun:stun.ipshka.com:3478' },
        { urls: 'stun:stun.iptel.org:3478' },
        { urls: 'stun:stun.irian.at:3478' },
        { urls: 'stun:stun.it1.hr:3478' },
        { urls: 'stun:stun.ivao.aero:3478' },
        { urls: 'stun:stun.jappix.com:3478' },
        { urls: 'stun:stun.jumblo.com:3478' },
        { urls: 'stun:stun.justvoip.com:3478' },
        { urls: 'stun:stun.kanet.ru:3478' },
        { urls: 'stun:stun.kiwilink.co.nz:3478' },
        { urls: 'stun:stun.kundenserver.de:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.linea7.net:3478' },
        { urls: 'stun:stun.linphone.org:3478' },
        { urls: 'stun:stun.liveo.fr:3478' },
        { urls: 'stun:stun.lowratevoip.com:3478' },
        { urls: 'stun:stun.lugosoft.com:3478' },
        { urls: 'stun:stun.lundimatin.fr:3478' },
        { urls: 'stun:stun.magnet.ie:3478' },
        { urls: 'stun:stun.manle.com:3478' },
        { urls: 'stun:stun.mgn.ru:3478' },
        { urls: 'stun:stun.mit.de:3478' },
        { urls: 'stun:stun.mitake.com.tw:3478' },
        { urls: 'stun:stun.miwifi.com:3478' },
        { urls: 'stun:stun.modulus.gr:3478' },
        { urls: 'stun:stun.mozcom.com:3478' },
        { urls: 'stun:stun.myvoiptraffic.com:3478' },
        { urls: 'stun:stun.mywatson.it:3478' },
        { urls: 'stun:stun.nas.net:3478' },
        { urls: 'stun:stun.neotel.co.za:3478' },
        { urls: 'stun:stun.netappel.com:3478' },
        { urls: 'stun:stun.netappel.fr:3478' },
        { urls: 'stun:stun.netgsm.com.tr:3478' },
        { urls: 'stun:stun.nfon.net:3478' },
        { urls: 'stun:stun.noblogs.org:3478' },
        { urls: 'stun:stun.noc.ams-ix.net:3478' },
        { urls: 'stun:stun.node4.co.uk:3478' },
        { urls: 'stun:stun.nonoh.net:3478' },
        { urls: 'stun:stun.nottingham.ac.uk:3478' },
        { urls: 'stun:stun.nova.is:3478' },
        { urls: 'stun:stun.nventure.com:3478' },
        { urls: 'stun:stun.on.net.mk:3478' },
        { urls: 'stun:stun.ooma.com:3478' },
        { urls: 'stun:stun.ooonet.ru:3478' },
        { urls: 'stun:stun.oriontelekom.rs:3478' },
        { urls: 'stun:stun.outland-net.de:3478' },
        { urls: 'stun:stun.ozekiphone.com:3478' },
        { urls: 'stun:stun.patlive.com:3478' },
        { urls: 'stun:stun.personal-voip.de:3478' },
        { urls: 'stun:stun.petcube.com:3478' },
        { urls: 'stun:stun.phone.com:3478' },
        { urls: 'stun:stun.phoneserve.com:3478' },
        { urls: 'stun:stun.pjsip.org:3478' },
        { urls: 'stun:stun.poivy.com:3478' },
        { urls: 'stun:stun.powerpbx.org:3478' },
        { urls: 'stun:stun.powervoip.com:3478' },
        { urls: 'stun:stun.ppdi.com:3478' },
        { urls: 'stun:stun.prizee.com:3478' },
        { urls: 'stun:stun.qq.com:3478' },
        { urls: 'stun:stun.qvod.com:3478' },
        { urls: 'stun:stun.rackco.com:3478' },
        { urls: 'stun:stun.rapidnet.de:3478' },
        { urls: 'stun:stun.rb-net.com:3478' },
        { urls: 'stun:stun.refint.net:3478' },
        { urls: 'stun:stun.remote-learner.net:3478' },
        { urls: 'stun:stun.rixtelecom.se:3478' },
        { urls: 'stun:stun.rockenstein.de:3478' },
        { urls: 'stun:stun.rolmail.net:3478' },
        { urls: 'stun:stun.rounds.com:3478' },
        { urls: 'stun:stun.rynga.com:3478' },
        { urls: 'stun:stun.samsungsmartcam.com:3478' },
        { urls: 'stun:stun.schlund.de:3478' },
        { urls: 'stun:stun.services.mozilla.com:3478' },
        { urls: 'stun:stun.sigmavoip.com:3478' },
        { urls: 'stun:stun.sip.us:3478' },
        { urls: 'stun:stun.sipdiscount.com:3478' },
        { urls: 'stun:stun.sipgate.net:10000' },
        { urls: 'stun:stun.sipgate.net:3478' },
        { urls: 'stun:stun.siplogin.de:3478' },
        { urls: 'stun:stun.sipnet.net:3478' },
        { urls: 'stun:stun.sipnet.ru:3478' },
        { urls: 'stun:stun.siportal.it:3478' },
        { urls: 'stun:stun.sippeer.dk:3478' },
        { urls: 'stun:stun.siptraffic.com:3478' },
        { urls: 'stun:stun.skylink.ru:3478' },
        { urls: 'stun:stun.sma.de:3478' },
        { urls: 'stun:stun.smartvoip.com:3478' },
        { urls: 'stun:stun.smsdiscount.com:3478' },
        { urls: 'stun:stun.snafu.de:3478' },
        { urls: 'stun:stun.softjoys.com:3478' },
        { urls: 'stun:stun.solcon.nl:3478' },
        { urls: 'stun:stun.solnet.ch:3478' },
        { urls: 'stun:stun.sonetel.com:3478' },
        { urls: 'stun:stun.sonetel.net:3478' },
        { urls: 'stun:stun.sovtest.ru:3478' },
        { urls: 'stun:stun.speedy.com.ar:3478' },
        { urls: 'stun:stun.spokn.com:3478' },
        { urls: 'stun:stun.srce.hr:3478' },
        { urls: 'stun:stun.ssl7.net:3478' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.symform.com:3478' },
        { urls: 'stun:stun.symplicity.com:3478' },
        { urls: 'stun:stun.sysadminman.net:3478' },
        { urls: 'stun:stun.t-online.de:3478' },
        { urls: 'stun:stun.tagan.ru:3478' },
        { urls: 'stun:stun.tatneft.ru:3478' },
        { urls: 'stun:stun.teachercreated.com:3478' },
        { urls: 'stun:stun.tel.lu:3478' },
        { urls: 'stun:stun.telbo.com:3478' },
        { urls: 'stun:stun.telefacil.com:3478' },
        { urls: 'stun:stun.tis-dialog.ru:3478' },
        { urls: 'stun:stun.tng.de:3478' },
        { urls: 'stun:stun.twt.it:3478' },
        { urls: 'stun:stun.u-blox.com:3478' },
        { urls: 'stun:stun.ucallweconn.net:3478' },
        { urls: 'stun:stun.ucsb.edu:3478' },
        { urls: 'stun:stun.ucw.cz:3478' },
        { urls: 'stun:stun.uls.co.za:3478' },
        { urls: 'stun:stun.unseen.is:3478' },
        { urls: 'stun:stun.usfamily.net:3478' },
        { urls: 'stun:stun.veoh.com:3478' },
        { urls: 'stun:stun.vidyo.com:3478' },
        { urls: 'stun:stun.vipgroup.net:3478' },
        { urls: 'stun:stun.virtual-call.com:3478' },
        { urls: 'stun:stun.viva.gr:3478' },
        { urls: 'stun:stun.vivox.com:3478' },
        { urls: 'stun:stun.vline.com:3478' },
        { urls: 'stun:stun.vo.lu:3478' },
        { urls: 'stun:stun.vodafone.ro:3478' },
        { urls: 'stun:stun.voicetrading.com:3478' },
        { urls: 'stun:stun.voip.aebc.com:3478' },
        { urls: 'stun:stun.voip.blackberry.com:3478' },
        { urls: 'stun:stun.voip.eutelia.it:3478' },
        { urls: 'stun:stun.voiparound.com:3478' },
        { urls: 'stun:stun.voipblast.com:3478' },
        { urls: 'stun:stun.voipbuster.com:3478' },
        { urls: 'stun:stun.voipbusterpro.com:3478' },
        { urls: 'stun:stun.voipcheap.co.uk:3478' },
        { urls: 'stun:stun.voipcheap.com:3478' },
        { urls: 'stun:stun.voipfibre.com:3478' },
        { urls: 'stun:stun.voipgain.com:3478' },
        { urls: 'stun:stun.voipgate.com:3478' },
        { urls: 'stun:stun.voipinfocenter.com:3478' },
        { urls: 'stun:stun.voipplanet.nl:3478' },
        { urls: 'stun:stun.voippro.com:3478' },
        { urls: 'stun:stun.voipraider.com:3478' },
        { urls: 'stun:stun.voipstunt.com:3478' },
        { urls: 'stun:stun.voipwise.com:3478' },
        { urls: 'stun:stun.voipzoom.com:3478' },
        { urls: 'stun:stun.vopium.com:3478' },
        { urls: 'stun:stun.voxgratia.org:3478' },
        { urls: 'stun:stun.voxox.com:3478' },
        { urls: 'stun:stun.voys.nl:3478' },
        { urls: 'stun:stun.voztele.com:3478' },
        { urls: 'stun:stun.vyke.com:3478' },
        { urls: 'stun:stun.webcalldirect.com:3478' },
        { urls: 'stun:stun.whoi.edu:3478' },
        { urls: 'stun:stun.wifirst.net:3478' },
        { urls: 'stun:stun.wwdl.net:3478' },
        { urls: 'stun:stun.xs4all.nl:3478' },
        { urls: 'stun:stun.xtratelecom.es:3478' },
        { urls: 'stun:stun.yesss.at:3478' },
        { urls: 'stun:stun.zadarma.com:3478' },
        { urls: 'stun:stun.zadv.com:3478' },
        { urls: 'stun:stun.zoiper.com:3478' },
        { urls: 'stun:stun1.faktortel.com.au:3478' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun1.voiceeclipse.net:3478' },
        { urls: 'stun:stunserver.org:3478' },

        // { urls: 'turn:turn01.hubl.in?transport=udp' },
        // { urls: 'turn:turn02.hubl.in?transport=tcp' },
        {
          urls: 'turn:relay.metered.ca:80',
          username: 'webrtc',
          credential: 'turnserver'
        },
        {
          urls: 'turn:relay.metered.ca:443',
          username: 'webrtc',
          credential: 'turnserver'
        },
        {
          urls: 'turns:relay.metered.ca:443?transport=tcp',
          username: 'webrtc',
          credential: 'turnserver'
        },
        {
          url: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
        },
        {
          url: 'turn:192.158.29.39:3478?transport=udp',
          credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
          username: '28224511:1379330808'
        },
        {
          url: 'turn:192.158.29.39:3478?transport=tcp',
          credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
          username: '28224511:1379330808'
        },
        {
          url: 'turn:turn.bistri.com:80',
          credential: 'homeo',
          username: 'homeo'
        },
        {
          url: 'turn:turn.anyfirewall.com:443?transport=tcp',
          credential: 'webrtc',
          username: 'webrtc'
        },
      ]
    });

    // ICE connection state monitoring
    peer.oniceconnectionstatechange = () => {
      const state = peer.iceConnectionState;
      console.log('ICE Connection State:', state);
      
      if (state === 'connected' || state === 'completed') {
        setConnectionStatus('Connected');
        setIsConnecting(false);
        setIsWaitingForConnection(false);
        onConnectionChange(true);
      } else if (state === 'disconnected') {
        console.log('ICE connection disconnected - network issue detected');
        setConnectionStatus('Connection lost');
        handleDisconnection();
      } else if (state === 'failed') {
        console.log('ICE connection failed - connection cannot be established');
        setConnectionStatus('Connection failed');
        handleDisconnection();
      } else if (state === 'closed') {
        console.log('ICE connection closed - peer disconnected');
        setConnectionStatus('Peer disconnected');
        handleDisconnection();
      } else if (state === 'checking') {
        setConnectionStatus('Connecting...');
      }
    };

    // Monitor connection state changes
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      console.log('Peer Connection State:', state);
      
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        console.log('Peer connection state indicates disconnection:', state);
        handleDisconnection();
      }
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate && signalingSocketRef.current?.readyState === WebSocket.OPEN) {
        console.log('Sending ICE candidate');
        signalingSocketRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          roomId: roomIdRef.current
        }));
      }
    };

    return peer;
  }, [onConnectionChange, handleDisconnection]);

  const setupDataChannel = useCallback((channel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setConnectionStatus('Connected');
      setIsConnecting(false);
      setIsWaitingForConnection(false);
      onConnectionChange(true);
      onDataChannelOpen(channel);
    };

    channel.onclose = () => {
      console.log('Data channel closed by peer');
      setConnectionStatus('Data channel closed');
      handleDisconnection();
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
      setConnectionStatus('Data channel error');
      handleDisconnection();
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'peer-disconnected') {
            console.log('Received peer disconnection message');
            handleDisconnection();
            return;
          }
          
          onMessage(message, channel);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      } else if (event.data instanceof ArrayBuffer) {
        onFileChunk(event.data);
      }
    };

    return channel;
  }, [onDataChannelOpen, onMessage, onFileChunk, onConnectionChange, handleDisconnection]);

  const setupSignalingSocket = useCallback((roomId, role) => {
    console.log(`Setting up signaling socket for ${role} in room:`, roomId);
    
    const socket = new WebSocket(SIGNALING_SERVER_URL);
    signalingSocketRef.current = socket;
    roomIdRef.current = roomId;
    roleRef.current = role;

    socket.onopen = () => {
      console.log('Signaling socket connected');
      socket.send(JSON.stringify({
        type: 'join-room',
        roomId: roomId,
        role: role
      }));
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log('Received signaling message:', message);

      const peer = connectionRef.current?.peer;
      if (!peer) return;

      switch (message.type) {
        case 'offer':
          if (role === 'receiver') {
            console.log('Receiver: Setting remote description from offer');
            await peer.setRemoteDescription(message.offer);
            
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            
            socket.send(JSON.stringify({
              type: 'answer',
              answer: answer,
              roomId: roomId
            }));
            
            console.log('Receiver: Sent answer');
          }
          break;

        case 'answer':
          if (role === 'sender') {
            console.log('Sender: Setting remote description from answer');
            await peer.setRemoteDescription(message.answer);
          }
          break;

        case 'ice-candidate':
          console.log('Adding ICE candidate');
          await peer.addIceCandidate(message.candidate);
          break;

        case 'peer-joined':
          if (role === 'sender' && message.peerRole === 'receiver') {
            console.log('Receiver joined, sender creating offer');
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            
            socket.send(JSON.stringify({
              type: 'offer',
              offer: offer,
              roomId: roomId
            }));
            
            console.log('Sender: Sent offer');
          }
          break;

        case 'peer-left':
          console.log('Peer left the room');
          handleDisconnection();
          break;

        case 'error':
          console.error('Signaling error:', message.message);
          setConnectionStatus('Signaling error');
          handleDisconnection();
          break;
      }
    };

    socket.onerror = (error) => {
      console.error('Signaling socket error:', error);
      setConnectionStatus('Signaling error');
      handleDisconnection();
    };

    socket.onclose = () => {
      console.log('Signaling socket closed');
      if (connectionRef.current) {
        handleDisconnection();
      }
    };

    return socket;
  }, [handleDisconnection]);

  const waitForConnection = useCallback(async () => {
    console.log('Sender waiting for incoming connections...');
    setIsWaitingForConnection(true);
    setConnectionStatus('Waiting for connection');
    
    try {
      const peer = createPeerConnection();
      
      // Create data channel as the sender
      const dataChannel = peer.createDataChannel('fileTransfer', {
        ordered: true
      });
      
      setupDataChannel(dataChannel);
      
      connectionRef.current = {
        peer,
        dataChannel,
        isInitiator: true
      };

      // Generate room ID for this session
      const roomId = Math.random().toString(36).substr(2, 9);
      setupSignalingSocket(roomId, 'sender');
      
    } catch (error) {
      console.error('Failed to wait for connection:', error);
      setIsWaitingForConnection(false);
      throw error;
    }
  }, [createPeerConnection, setupDataChannel, setupSignalingSocket]);

  const connect = useCallback(async (remotePeerId) => {
    console.log('Receiver connecting to sender:', remotePeerId);
    setIsConnecting(true);
    setConnectionStatus('Connecting');
    
    try {
      const peer = createPeerConnection();
      
      // Listen for incoming data channel
      peer.ondatachannel = (event) => {
        console.log('Received data channel from sender');
        const channel = event.channel;
        setupDataChannel(channel);
        
        connectionRef.current = {
          ...connectionRef.current,
          dataChannel: channel,
          isInitiator: false
        };
      };

      connectionRef.current = {
        peer,
        dataChannel: null,
        isInitiator: false
      };

      // Use the remotePeerId as the room ID
      setupSignalingSocket(remotePeerId, 'receiver');
      
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      setConnectionStatus('Disconnected');
      throw error;
    }
  }, [createPeerConnection, setupDataChannel, setupSignalingSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current?.peer) {
        connectionRef.current.peer.close();
      }
      if (signalingSocketRef.current) {
        signalingSocketRef.current.close();
      }
    };
  }, []);

  return {
    connectionStatus,
    isConnecting,
    isWaitingForConnection,
    connectionRef,
    waitForConnection,
    connect,
    handleDisconnection
  };
};
