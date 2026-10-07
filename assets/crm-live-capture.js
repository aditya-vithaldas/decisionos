class CrmLiveCapture extends AudioWorkletProcessor{
 constructor(){super();this.samples=[];this.speaking=false;this.quiet=0;}
 process(inputs){const input=inputs[0]?.[0];if(!input)return true;let power=0;for(const sample of input)power+=sample*sample;const loud=Math.sqrt(power/input.length)>.015;if(loud){this.speaking=true;this.quiet=0;}else if(this.speaking){this.quiet+=input.length/sampleRate;if(this.quiet>.18){this.port.postMessage({speechEnd:true});this.speaking=false;}}
 this.samples.push(...input);if(this.samples.length>=2048){const count=Math.floor(this.samples.length*16000/sampleRate),out=new Int16Array(count);for(let i=0;i<count;i++){const start=Math.floor(i*sampleRate/16000),end=Math.min(this.samples.length,Math.floor((i+1)*sampleRate/16000));let v=0;for(let j=start;j<end;j++)v+=this.samples[j];out[i]=Math.max(-1,Math.min(1,v/Math.max(1,end-start)))*32767;}this.port.postMessage(out.buffer,[out.buffer]);this.samples=[];}return true;}
}
registerProcessor('crm-live-capture',CrmLiveCapture);
