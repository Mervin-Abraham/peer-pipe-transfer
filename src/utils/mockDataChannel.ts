
// Mock data channel class for better simulation
export class MockDataChannel extends EventTarget {
  public readyState: 'connecting' | 'open' | 'closing' | 'closed' = 'connecting';
  public binaryType: 'blob' | 'arraybuffer' = 'arraybuffer';
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  send(data: string | ArrayBuffer) {
    if (this.readyState !== 'open') {
      throw new Error('RTCDataChannel.readyState is not \'open\'');
    }
    console.log('MockDataChannel: Sending data', data);
    // Simulate receiving the message on the other end
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 10);
  }

  close() {
    this.readyState = 'closed';
    if (this.onclose) {
      this.onclose(new Event('close'));
    }
  }

  simulateOpen() {
    this.readyState = 'open';
    console.log('MockDataChannel: Simulating open state');
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
}
