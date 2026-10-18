import type { Metadata } from 'next';
import './style.css';
export const metadata:Metadata={title:'LottoLab',description:'개인용 로또 통계 및 추천'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
