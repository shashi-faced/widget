(()=>{(function(){"use strict";let r={apiKey:null,apiEndpoint:null,theme:"light",welcomeMessage:"Hello! How can I help you today?",debug:!0,bypassApiKeyValidation:!0},i=(...a)=>{r.debug&&console.log("[AI Widget]",...a)},n=(...a)=>{console.error("[AI Widget]",...a)};class d{constructor(e){this.config={...r,...e},this.sessionId=this.generateSessionId(),this.history=[],this.isRecording=!1,this.isLoading=!1,this.persistentCallMode=!1,this.isInCall=!1,this.shouldKeepListening=!1,this.suspendedForTTS=!1,this.ignoreRecognitionForTTS=!1,this.recognition=null,this.synthesis=null,this.micStream=null,this.shadowRoot=null,this.init()}async prewarmMic(){try{this.micStream||(this.micStream=await navigator.mediaDevices.getUserMedia({audio:!0}),i("Microphone stream acquired and cached"))}catch(e){throw n("Unable to access microphone:",e),e}}cleanup(){this.micStream&&(this.micStream.getTracks().forEach(e=>e.stop()),this.micStream=null,i("Microphone stream stopped")),this.recognition&&(this.recognition.stop(),this.recognition=null),this.synthesis&&this.synthesis.cancel(),this.shouldKeepListening=!1,this.isRecording=!1,this.isInCall=!1,this.suspendedForTTS=!1,this.ignoreRecognitionForTTS=!1}generateSessionId(){return"session_"+Math.random().toString(36).substr(2,9)}async init(){i("Starting widget initialization..."),this.createShadowDOM(),i("Shadow DOM created");try{await this.prewarmMic(),this.setupSpeechRecognition(),i("Speech recognition setup complete")}catch(e){n("Failed to initialize microphone:",e)}this.setupSpeechSynthesis(),i("Speech synthesis setup complete"),this.bindEvents(),i("Events bound"),this.addWelcomeMessage(),i("Widget fully initialized and should be visible")}createShadowDOM(){let e=document.createElement("div");e.id="ai-voice-widget",this.shadowRoot=e.attachShadow({mode:"closed"}),this.shadowRoot.innerHTML=`
        <style>
          :host {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          }
          
          .widget-container {
            background: ${this.config.theme==="dark"?"#282c34":"#fafafa"};
            border-radius: 16px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.15);
            max-width: 380px;
            overflow: hidden;
            transform: translateY(100%);
            transition: transform 0.5s ease;
          }
          
          .widget-container.open {
            transform: translateY(0);
          }
          
          .widget-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
          }
          
          .widget-header::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            opacity: 0.5;
          }
          
          .widget-title {
            font-weight: 600;
            font-size: 17px;
            letter-spacing: 0.5px;
          }
          
          .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
          }
          
          .close-btn:hover {
            background: rgba(255,255,255,0.1);
          }
          
          .chat-container {
            height: 250px;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .message {
            max-width: 80%;
            padding: 10px 16px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
          }
          
          .message.user {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            align-self: flex-end;
            animation: fadeInUp 0.5s ease both;
          }
          
          @keyframes fadeInUp {
            0% {
              opacity: 0;
              transform: translateY(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .message.assistant {
            background: ${this.config.theme==="dark"?"linear-gradient(135deg, #555, #444)":"linear-gradient(135deg, #f0f0f0, #e0e0e0)"};
            color: ${this.config.theme==="dark"?"#fff":"#333"};
            align-self: flex-start;
            animation: fadeInUp 0.5s ease both;
          }
          
          .input-container {
            padding: 16px;
            border-top: 1px solid ${this.config.theme==="dark"?"#333":"#eee"};
            display: flex;
            gap: 8px;
            align-items: center;
          }
          
          .message-input {
            flex: 1;
            padding: 10px 16px;
            border: 2px solid ${this.config.theme==="dark"?"#444":"#e0e0e0"};
            border-radius: 25px;
            font-size: 14px;
            background: ${this.config.theme==="dark"?"#333":"#fff"};
            color: ${this.config.theme==="dark"?"#fff":"#333"};
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
          }
          
          .message-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
          }
          
          .voice-btn {
            width: 42px;
            height: 42px;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: transform 0.3s ease, background 0.3s ease;
            background: #ff4757;
            color: white;
          }
          
          
          .voice-btn:hover {
            background: #ff3742;
            transform: scale(1.1);
          }
          
          .voice-btn.recording {
            background: #ff6b7a;
            animation: pulse 1s infinite;
          }
          
          .voice-btn.persistent {
            background: #2ecc71;
            box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.3);
          }
          
          .voice-btn.persistent.recording {
            background: #27ae60;
            animation: pulse 1s infinite;
          }
          
          .call-container {
            padding: 16px;
            border-top: 1px solid ${this.config.theme==="dark"?"#333":"#eee"};
            background: ${this.config.theme==="dark"?"#1a1a1a":"#f8f9fa"};
          }
          
          .call-status {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          
          .call-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #2ecc71;
            font-weight: 600;
            font-size: 14px;
            animation: pulse 1s infinite;
          }
          
          .end-call-btn {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
          }
          
          .end-call-btn:hover {
            background: #c0392b;
            transform: scale(1.05);
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          .loading {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            color: #666;
            background: ${this.config.theme==="dark"?"#333":"#f5f5f5"};
            border-radius: 18px;
            margin-bottom: 8px;
            animation: fadeInUp 0.3s ease;
          }
          
          .loading-dots {
            display: flex;
            gap: 4px;
          }
          
          .loading-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #667eea;
            animation: loading 1.4s ease-in-out infinite both;
          }
          
          .loading-dot:nth-child(1) { animation-delay: -0.32s; }
          .loading-dot:nth-child(2) { animation-delay: -0.16s; }
          
          @keyframes loading {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
          
          .fab {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 6px 24px rgba(0,0,0,0.3);
            transition: all 0.4s ease;
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10001;
            animation: fabAppear 0.6s ease-out;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
          }
          
          .fab:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          }
          
          .fab.hidden {
            display: none;
          }
          
          @keyframes fabAppear {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        </style>
        
        <div class="widget-container" id="widgetContainer">
          <div class="widget-header">
            <div class="widget-title">\u{1F4DE} AI Voice Call</div>
            <button class="close-btn" id="closeBtn">\xD7</button>
          </div>
          <div class="chat-container" id="chatContainer">
            <!-- Messages will be added here -->
          </div>
          <div class="input-container" id="inputContainer">
            <input type="text" class="message-input" id="messageInput" placeholder="Type your message or click call to speak..." />
            <button class="voice-btn" id="voiceBtn">\u{1F4DE}</button>
          </div>
          <div class="call-container" id="callContainer" style="display: none;">
            <div class="call-status">
              <div class="call-indicator">\u{1F4DE} Call in progress...</div>
              <button class="end-call-btn" id="endCallBtn">End Call</button>
            </div>
          </div>
        </div>
        
        <button class="fab" id="fabBtn">\u{1F4AC} Need Help?</button>
      `,document.body.appendChild(e),i("Container appended to body"),this.elements={container:this.shadowRoot.getElementById("widgetContainer"),fab:this.shadowRoot.getElementById("fabBtn"),closeBtn:this.shadowRoot.getElementById("closeBtn"),chatContainer:this.shadowRoot.getElementById("chatContainer"),messageInput:this.shadowRoot.getElementById("messageInput"),voiceBtn:this.shadowRoot.getElementById("voiceBtn"),inputContainer:this.shadowRoot.getElementById("inputContainer"),callContainer:this.shadowRoot.getElementById("callContainer"),endCallBtn:this.shadowRoot.getElementById("endCallBtn")},i("Elements:",this.elements),i("FAB button:",this.elements.fab),this.elements.fab&&(this.elements.fab.style.display="flex",i("FAB button should now be visible"))}togglePersistentCallMode(){this.persistentCallMode=!this.persistentCallMode,this.persistentCallMode?(i("Persistent call mode enabled"),this.elements.voiceBtn.classList.add("persistent"),this.addMessage("Persistent call mode enabled! Double-click again to disable.","assistant")):(i("Persistent call mode disabled"),this.elements.voiceBtn.classList.remove("persistent"),this.addMessage("Persistent call mode disabled.","assistant"))}setupSpeechRecognition(){"webkitSpeechRecognition"in window?(this.recognition=new webkitSpeechRecognition,this.recognition.continuous=!0,this.recognition.interimResults=!1,this.recognition.lang="en-US",this.recognition.onresult=e=>{if(this.ignoreRecognitionForTTS||this.suspendedForTTS){i("Ignoring recognition result due to TTS playback");return}let t=e.results[e.results.length-1][0].transcript;i("Recognition result:",t),this.elements.messageInput.value=t,this.sendMessage(t)},this.recognition.onend=()=>{this.isRecording=!1,this.elements.voiceBtn.classList.remove("recording"),!this.suspendedForTTS&&this.isInCall&&this.shouldKeepListening&&this.restartRecognition()},this.recognition.onerror=e=>{n("Speech recognition error:",e.error),this.isRecording=!1,this.elements.voiceBtn.classList.remove("recording"),e.error==="not-allowed"&&(n("Microphone permission denied"),this.shouldKeepListening=!1)}):i("Speech recognition not supported")}restartRecognition(){if(!this.recognition||!this.shouldKeepListening){i("Cannot restart recognition - missing recognition or shouldKeepListening is false");return}try{setTimeout(()=>{this.isInCall&&this.shouldKeepListening&&!this.suspendedForTTS?(i("Restarting speech recognition..."),this.recognition.start(),this.isRecording=!0,this.elements.voiceBtn.classList.add("recording"),i("Speech recognition restarted successfully")):i("Skipping recognition restart:",{isInCall:this.isInCall,shouldKeepListening:this.shouldKeepListening,suspendedForTTS:this.suspendedForTTS})},100)}catch(e){n("Failed to restart recognition:",e),this.shouldKeepListening=!1}}setupSpeechSynthesis(){"speechSynthesis"in window?this.synthesis=window.speechSynthesis:i("Speech synthesis not supported")}bindEvents(){this.elements.fab.addEventListener("click",()=>{this.openWidget()}),this.elements.closeBtn.addEventListener("click",()=>{this.closeWidget()}),this.elements.voiceBtn.addEventListener("dblclick",()=>{this.togglePersistentCallMode()}),this.elements.voiceBtn.addEventListener("click",()=>{this.startCall()}),this.elements.endCallBtn.addEventListener("click",()=>{this.endCall()}),this.elements.messageInput.addEventListener("keypress",e=>{if(e.key==="Enter"&&!this.isInCall){let t=this.elements.messageInput.value.trim();t&&(this.sendMessage(t),this.elements.messageInput.value="")}})}openWidget(){this.elements.container.classList.add("open"),this.elements.fab.classList.add("hidden"),this.elements.fab.style.display="none",this.elements.messageInput.focus()}closeWidget(){this.elements.container.classList.remove("open"),this.elements.fab.classList.remove("hidden"),this.elements.fab.style.display="flex"}startCall(){this.elements.inputContainer.style.display="none",this.elements.callContainer.style.display="block",this.isInCall=!0,this.shouldKeepListening=!0,this.toggleRecording()}endCall(){this.shouldKeepListening=!1,this.isInCall=!1,this.isRecording&&this.recognition.stop(),this.elements.inputContainer.style.display="flex",this.elements.callContainer.style.display="none",this.elements.voiceBtn.classList.remove("persistent","recording"),i("Call ended, keeping microphone stream for future use")}toggleRecording(){if(!this.recognition){alert("Speech recognition not supported in this browser");return}if(this.isRecording)this.shouldKeepListening=!1,this.recognition.stop();else{this.shouldKeepListening=!0;try{this.recognition.start(),this.isRecording=!0,this.elements.voiceBtn.classList.add("recording")}catch(e){n("Failed to start recognition:",e),this.shouldKeepListening=!1}}}addMessage(e,t="user"){let s=document.createElement("div");s.className=`message ${t}`,s.textContent=e,this.elements.chatContainer.appendChild(s),this.elements.chatContainer.scrollTop=this.elements.chatContainer.scrollHeight}addWelcomeMessage(){this.addMessage(this.config.welcomeMessage,"assistant")}showLoading(){let e=document.createElement("div");e.className="loading",e.innerHTML=`
        <span>AI is typing</span>
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
      `,e.id="loading",this.elements.chatContainer.appendChild(e),this.elements.chatContainer.scrollTop=this.elements.chatContainer.scrollHeight}hideLoading(){let e=this.elements.chatContainer.querySelector("#loading");e&&e.remove()}async sendMessage(e){if(!this.isLoading){this.isLoading=!0,this.elements.voiceBtn.disabled=!0,this.addMessage(e,"user"),this.history.push({role:"user",content:e}),this.showLoading();try{let t={"Content-Type":"application/json"};!r.bypassApiKeyValidation&&this.config.apiKey?(t.Authorization=`Bearer ${this.config.apiKey}`,i("Using API key authentication")):i("API key authentication bypassed - public access");let s=await fetch(this.config.apiEndpoint,{method:"POST",headers:t,body:JSON.stringify({message:e,sessionId:this.sessionId,history:this.history})});if(!s.ok){let c=(await s.json().catch(()=>({}))).error||`API error: ${s.status}`;throw new Error(c)}let o=await s.json();this.hideLoading(),this.addMessage(o.response,"assistant"),this.history.push({role:"assistant",content:o.response}),this.speak(o.response)}catch(t){n("Error sending message:",t),this.hideLoading();let s="Sorry, I encountered an error. Please try again.";t.message&&t.message.includes("AI service temporarily unavailable")?s="AI service is currently unavailable. This may be due to quota limits or server issues. Please try again later.":t.message&&t.message.includes("429")?s="AI service is temporarily unavailable due to quota limits. Please try again later.":t.message&&t.message.includes("401")?s="Authentication error. Please check your API key.":t.message&&t.message.includes("500")&&(s="Server error. Please try again later."),this.addMessage(s,"assistant")}finally{this.isLoading=!1,this.elements.voiceBtn.disabled=!1}}}speak(e){if(!this.synthesis)return;this.synthesis.cancel();let t=new SpeechSynthesisUtterance(e);t.rate=.9,t.pitch=1,t.volume=1;let s=this.isRecording;this.isRecording&&(this.recognition.stop(),this.isRecording=!1,this.elements.voiceBtn.classList.remove("recording"),this.suspendedForTTS=!0),t.onend=()=>{this.suspendedForTTS=!1,this.ignoreRecognitionForTTS=!1,this.isInCall&&s&&this.shouldKeepListening&&this.restartRecognition()},t.onerror=()=>{this.suspendedForTTS=!1,this.ignoreRecognitionForTTS=!1,this.isInCall&&s&&this.shouldKeepListening&&this.restartRecognition()},this.synthesis.speak(t)}}function l(){console.log("[AI Widget] initWidget called");let a=document.getElementsByTagName("script"),e=null;for(let o of a)if(o.src&&o.src.includes("ai-voice-widget.js")){e=o;break}if(!e){console.error("[AI Widget] Widget script tag not found");return}console.log("[AI Widget] Found widget script:",e);let t={apiKey:e.dataset.apiKey,apiEndpoint:e.dataset.apiEndpoint,theme:e.dataset.theme||"light",welcomeMessage:e.dataset.welcomeMessage||"Hello! How can I help you today?",debug:!0};if(console.log("[AI Widget] Config:",t),r.bypassApiKeyValidation)console.log("[AI Widget] \u{1F513} API key validation bypassed - public access enabled"),console.log("[AI Widget] To re-enable authentication, set CONFIG.bypassApiKeyValidation = false");else{if(!t.apiKey){n("API key is required");return}console.log("[AI Widget] \u{1F510} API key validation enabled")}t.apiEndpoint||(console.warn("[AI Widget] No API endpoint provided, using default deployed backend"),t.apiEndpoint="https://ai-voice-widget.onrender.com/chat"),console.log("[AI Widget] Creating widget instance..."),new d(t)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",l):l()})();})();
