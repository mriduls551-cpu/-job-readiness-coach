import { ImageResponse } from 'next/og';
import { getDB } from '@/lib/db';
import { getLocaleValue } from '@/lib/product';

export const runtime = 'edge';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

function shareUrl(publicId: string) {
  return `/r/${publicId}`;
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const share = await getDB().getPublicShare(publicId);

  const locale = share?.locale || 'en';
  const firstName = share?.firstName || 'You';
  const roleLabel = share ? getLocaleValue(share.roleName, share.locale) : 'fit check';
  const roleSummary = share
    ? getLocaleValue(share.roleSummary, share.locale)
    : 'Find the role that fits you best.';
  const dimensions = share
    ? [
        {
          label: locale === 'en' ? 'Numbers' : 'संख्यात्मक',
          value: share.dimensionSnapshot.numerical,
        },
        {
          label: locale === 'en' ? 'People' : 'लोग',
          value:
            share.dimensionSnapshot['people-reactive'] + share.dimensionSnapshot['people-proactive'],
        },
        {
          label: locale === 'en' ? 'Structure' : 'व्यवस्था',
          value: share.dimensionSnapshot['process-ops'],
        },
        {
          label: locale === 'en' ? 'Creative' : 'रचनात्मकता',
          value: share.dimensionSnapshot['creative-output'],
        },
      ]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(135deg, rgba(255,243,224,1) 0%, rgba(255,255,255,1) 45%, rgba(241,248,239,1) 100%)',
          color: '#13201d',
          fontFamily: 'Inter, Arial, sans-serif',
          padding: '56px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: '36px',
            border: '1px solid rgba(19, 32, 29, 0.08)',
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 24px 70px rgba(19, 32, 29, 0.14)',
            padding: '44px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '760px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  borderRadius: '999px',
                  background: '#f7b538',
                  color: 'white',
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  padding: '12px 18px',
                  textTransform: 'uppercase',
                }}
              >
                Job Readiness Coach
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    fontSize: '26px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#6a695f',
                  }}
                >
                  Shared fit card
                </div>
                <div style={{ fontSize: '64px', lineHeight: 1.02, fontWeight: 800 }}>
                  {firstName} leans toward {roleLabel}.
                </div>
                <div style={{ fontSize: '30px', lineHeight: 1.35, color: '#4f5a54', maxWidth: '840px' }}>
                  {roleSummary}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minWidth: '250px',
                alignSelf: 'flex-start',
              }}
            >
              <div
                style={{
                  borderRadius: '28px',
                  background: '#fff7e9',
                  color: '#8c3f00',
                  fontSize: '20px',
                  fontWeight: 700,
                  padding: '18px 20px',
                }}
              >
                First name only
              </div>
              <div
                style={{
                  borderRadius: '28px',
                  background: '#ecf7ec',
                  color: '#16513d',
                  fontSize: '20px',
                  fontWeight: 700,
                  padding: '18px 20px',
                }}
              >
                Free fit check
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '18px', marginTop: '34px' }}>
            {dimensions.map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  borderRadius: '30px',
                  border: '1px solid rgba(19, 32, 29, 0.08)',
                  background: 'rgba(255,255,255,0.95)',
                  padding: '24px 26px',
                }}
              >
                <div
                  style={{
                    color: '#6a695f',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: '54px', fontWeight: 800, marginTop: '10px', color: '#16513d' }}>
                  {item.value}%
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '28px',
              gap: '20px',
            }}
          >
            <div style={{ fontSize: '24px', color: '#4f5a54', lineHeight: 1.35, maxWidth: '760px' }}>
              Find which track fits you - free, 12 minutes
            </div>
            <div
              style={{
                borderRadius: '999px',
                background: '#13201d',
                color: 'white',
                fontSize: '20px',
                fontWeight: 700,
                padding: '16px 24px',
              }}
            >
              {share ? shareUrl(share.publicId) : '/career-fit-check'}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
