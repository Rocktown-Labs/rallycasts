/* eslint-disable no-bitwise, no-plusplus */
export class BloomFilter {
  private size: number;
  private bits: Uint8Array;
  private hashCount: number;

  constructor(size = 1000, hashCount = 3) {
    this.size = size;
    this.bits = new Uint8Array(Math.ceil(size / 8));
    this.hashCount = hashCount;
  }

  private hash(str: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = (hash ^ (str.codePointAt(i) ?? 0)) * 0x01_00_01_93;
    }
    return Math.abs(hash) % this.size;
  }

  add(str: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const idx = this.hash(str, i);
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      this.bits[byteIdx] = (this.bits[byteIdx] ?? 0) | (1 << bitIdx);
    }
  }

  has(str: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const idx = this.hash(str, i);
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      if (((this.bits[byteIdx] ?? 0) & (1 << bitIdx)) === 0) {
        return false;
      }
    }
    return true;
  }
}
