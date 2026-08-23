import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // 開発環境ではキャッシュを無効化
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 既存の設定があればここに記述
};

export default withPWA(nextConfig);
