
// Mock data channel class for better simulation
export class MockDataChannel extends EventTarget {
  public readyState: 'connecting' | 'open' | 'closing' | 'closed' = 'connecting';
  public binaryType: 'blob' | 'arraybuffer' = 'arraybuffer';
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  
  // Static registry to simulate cross-peer communication
  private static instances: MockDataChannel[] = [];
  private peerId: string;

  constructor(peerId: string) {
    super();
    this.peerId = peerId;
    MockDataChannel.instances.push(this);
  }

  send(data: string | ArrayBuffer) {
    if (this.readyState !== 'open') {
      throw new Error('RTCDataChannel.readyState is not \'open\'');
    }
    console.log(`MockDataChannel (${this.peerId}): Sending data`, data);
    
    // Send to OTHER peer instances, not self
    setTimeout(() => {
      MockDataChannel.instances.forEach(instance => {
        if (instance !== this && instance.onmessage && instance.readyState === 'open') {
          console.log(`MockDataChannel: Delivering message from ${this.peerId} to ${instance.peerId}`);
          instance.onmessage(new MessageEvent('message', { data }));
        }
      });
    }, 10);
  }

  close() {
    this.readyState = 'closed';
    if (this.onclose) {
      this.onclose(new Event('close'));
    }
    // Remove from registry
    const index = MockDataChannel.instances.indexOf(this);
    if (index > -1) {
      MockDataChannel.instances.splice(index, 1);
    }
  }

  simulateOpen() {
    this.readyState = 'open';
    console.log(`MockDataChannel (${this.peerId}): Simulating open state`);
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  static clearAll() {
    MockDataChannel.instances = [];
  }
}
