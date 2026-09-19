export default function WaveDivider({ fill = '#F1E9D8' }) {
  return (
    <div className="wave-divider">
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
        <path d="M0,40 C280,110 480,-20 760,40 C1040,100 1200,10 1440,50 L1440,100 L0,100 Z" fill={fill} />
      </svg>
    </div>
  );
}
