
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Resend API key is missing. Set RESEND_API_KEY in Cloudflare settings." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { report, billDate, billTitle } = await request.json();
    const { participant, assignedItems, totalAmount } = report;

    if (!participant.email) {
      return new Response(JSON.stringify({ error: "Recipient email is missing." }), { status: 400 });
    }

    const itemsHtml = assignedItems.map(item => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333;">
          ${item.itemName} ${item.isShared ? '<span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 10px;">Shared</span>' : ''}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: bold; color: #111111;">
          LKR ${item.amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `).join('');

    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <h1 style="color: #0284c7; font-size: 24px; margin-bottom: 8px;">Bill Keeper</h1>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Individual Settlement Report</p>
        
        <p style="color: #1e293b; font-size: 16px;">Hello <strong>${participant.name}</strong>,</p>
        <p style="color: #475569; font-size: 15px; line-height: 1.5;">Here is your breakdown for <strong>${billTitle || 'Untitled Bill'}</strong> dated ${billDate}.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <thead>
            <tr>
              <th style="text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase; padding-bottom: 8px;">Item</th>
              <th style="text-align: right; font-size: 12px; color: #94a3b8; text-transform: uppercase; padding-bottom: 8px;">Your Share</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding-top: 20px; font-size: 18px; font-weight: bold; color: #1e293b;">Total Payable</td>
              <td style="padding-top: 20px; text-align: right; font-size: 20px; font-weight: 900; color: #0284c7;">
                LKR ${totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8;">Sent via Bill Keeper – LKR</p>
        </div>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'Bill Keeper <onboarding@resend.dev>',
        to: participant.email,
        subject: `Bill Split: ${billTitle || 'Untitled'} (${billDate})`,
        html: emailBody
      })
    });

    const result = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(JSON.stringify({ error: result.message || "Resend API Error" }), {
        status: resendResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
