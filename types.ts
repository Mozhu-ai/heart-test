export interface AudioState {
  isPlaying: boolean;
  initialized: boolean;
}

export interface ParticleSystemProps {
  onBeat: () => void;
  beatActive: boolean;
}