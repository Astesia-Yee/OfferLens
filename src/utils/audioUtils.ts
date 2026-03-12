export async function chunkAudio(file: Blob, maxDurationSec: number = 600): Promise<Blob[]> {
  // 1. Create AudioContext (16kHz is enough for speech recognition and saves space)
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  
  // 2. Read file to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // 3. Decode audio data
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  const chunks: Blob[] = [];
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const totalSamples = audioBuffer.length;
  const samplesPerChunk = maxDurationSec * sampleRate;
  
  for (let offset = 0; offset < totalSamples; offset += samplesPerChunk) {
    const chunkSamples = Math.min(samplesPerChunk, totalSamples - offset);
    const chunkBuffer = audioCtx.createBuffer(channels, chunkSamples, sampleRate);
    
    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const chunkData = chunkBuffer.getChannelData(channel);
      for (let i = 0; i < chunkSamples; i++) {
        chunkData[i] = channelData[offset + i];
      }
    }
    
    // Convert chunkBuffer to WAV Blob
    const wavBlob = audioBufferToWav(chunkBuffer);
    chunks.push(wavBlob);
  }
  
  return chunks;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const result = new Float32Array(buffer.length * numChannels);
  
  // Interleave channels
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < buffer.length; i++) {
      result[i * 2] = left[i];
      result[i * 2 + 1] = right[i];
    }
  } else {
    result.set(buffer.getChannelData(0));
  }
  
  // Convert to 16-bit PCM
  const dataLength = result.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const data = new DataView(new ArrayBuffer(bufferLength));
  
  // Write WAV header
  writeString(data, 0, 'RIFF');
  data.setUint32(4, 36 + dataLength, true);
  writeString(data, 8, 'WAVE');
  writeString(data, 12, 'fmt ');
  data.setUint32(16, 16, true); // Subchunk1Size
  data.setUint16(20, format, true); // AudioFormat
  data.setUint16(22, numChannels, true); // NumChannels
  data.setUint32(24, sampleRate, true); // SampleRate
  data.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
  data.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  data.setUint16(34, bitDepth, true); // BitsPerSample
  writeString(data, 36, 'data');
  data.setUint32(40, dataLength, true); // Subchunk2Size
  
  // Write PCM data
  let offset = 44;
  for (let i = 0; i < result.length; i++) {
    const s = Math.max(-1, Math.min(1, result[i]));
    data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([data], { type: 'audio/wav' });
}

function writeString(data: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    data.setUint8(offset + i, string.charCodeAt(i));
  }
}
