import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';

export const runtime = 'edge';

import '../styles/globals.css';

import React, {Suspense} from 'react';
import AuthWrapper from '@/auth/Wrapper';
import {TRPCWrapper} from '@/trpc/Wrapper';
import Navigation from '@/components/custom/Navigation';
import {Toaster} from '@/components/ui/toaster';
import {RedirectType} from 'next/dist/client/components/redirect';
import {LoginModalProvider} from '@/contexts/LoginModalContext';

export const metadata: Metadata = {
    title: 'Jonogon — জনগণ',
    description: 'আমাদের দাবির প্লাটফর্ম',
    metadataBase: new URL('https://jonogon.org'),
    openGraph: {
        title: 'Jonogon — জনগণ',
        description: 'আমাদের দাবির প্লাটফর্ম',
        url: 'https://jonogon.org',
        siteName: 'jonogon.org',
        type: 'website',
        images: [
            {
                url: 'https://jonogon.org/opengraph-image.jpeg',
            },
        ],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const headersList = headers();
    const host = headersList.get('host');

    if (host === 'www.jonogon.org') {
        redirect(`https://jonogon.org/`, RedirectType.replace);
    }

    return (
        <html lang="en">
            <body className={''}>
                <AuthWrapper>
                    <TRPCWrapper hostname={'localhost'}>
                        <Suspense fallback={<>LOADING ...</>}>
                            <LoginModalProvider>
                                <Navigation />
                                <div className={'mt-16'}>
                                    <Toaster />
                                    {children}
                                </div>
                            </LoginModalProvider>
                        </Suspense>
                    </TRPCWrapper>
                </AuthWrapper>
            </body>
        </html>
    );
}
