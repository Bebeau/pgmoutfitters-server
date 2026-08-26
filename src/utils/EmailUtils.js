// const config = require('../../config/keys');
// const nodemailer = require('nodemailer');
// const hbs = require('nodemailer-express-handlebars');
// const transporter = nodemailer.createTransport(config.email);
// const handlebarOptions = config.email.template;

// transporter.verify(function (err) {
//   if (err) {
//     return console.log(err);
//   }
//   return console.log("Server is ready to send emails");
// });

// transporter.use('compile', hbs(handlebarOptions));

// class EmailUtils {
//     static async setRetailPricing(cart) {
//         let newCart = [];
//         cart.forEach((item) => {
//             if (item.qty > 0) {
//                 newCart.push({
//                     name: item.name,
//                     qty: item.qty,
//                     link: `https://pgmoutfitters.com/products/deer-feeders/${item.name.toLowerCase()}`,
//                     price: EmailUtils.formatter.format(Number(item.price.retail))
//                 });
//             }
//         });
//         return newCart;
//     }
//     // static async setDealerPricing(cart) {
//     //     let newCart = [];
//     //     cart.forEach((item) => {
//     //         if (item.qty > 0) {
//     //             newCart.push({
//     //                 name: item.name,
//     //                 qty: item.qty,
//     //                 link: `https://pgmoutfitters.com/products/deer-feeders/${item.name.toLowerCase()}`,
//     //                 price: EmailUtils.formatter.format(Number(item.price.dealer))
//     //             });
//     //         }
//     //     });
//     //     return newCart;
//     // }
//     // static isDealerPricing(type, cart) {
//     //     let totalInputValue = 0;
//     //     cart.map((item) => {
//     //         totalInputValue = Number(item.qty) + totalInputValue;
//     //     });
//     //     if (totalInputValue >= 5 && type !== 'hunter') {
//     //         return true;
//     //     }
//     //     return false;
//     // }
//     static capitalize(word) {
//         return word[0].toUpperCase() + word.slice(1).toLowerCase();
//     }
//     static formatter = new Intl.NumberFormat('en-US', {
//         style: 'currency',
//         currency: 'USD',
//         maximumFractionDigits: 0,
//     });
//     static async sendStaffEmail(inquiry) {
//         console.log('SEND EMAIL FUNCTION STARTED...');
//         // const isDealerPricing = EmailUtils.isDealerPricing(inquiry.type, inquiry.cart);
//         let newCart;
//         newCart = await EmailUtils.setRetailPricing(inquiry.cart);
//         // if (isDealerPricing) {
//         //     newCart = await EmailUtils.setDealerPricing(inquiry.cart);
//         // }
//         const staffEmail = {
//             from: 'PGM Outfitters Website Inquiry <noreply@pgmoutfitters.com>',
//             to: 'sales@pgmoutfitters.com',
//             subject: 'New Purchase Inquiry',
//             template: 'staff',
//             context: { 
//                 type: EmailUtils.capitalize(inquiry.type),
//                 company: inquiry.companyName,
//                 first: inquiry.firstName,
//                 last: inquiry.lastName,
//                 email: inquiry.email,
//                 phone: inquiry.phone,
//                 cart: newCart,
//                 cost: inquiry.cost
//             }
//         };

//         return new Promise((resolve, reject) => {
//             transporter.sendMail(staffEmail, (err) => {
//                 if (err) {
//                     console.log(err);
//                     reject('Staff autoresponder failed to send: ', err);
//                 }
//                 console.log('Autoresponder successfully sent...');
//                 resolve();
//             });
//         });
//     }
// }

// module.exports = EmailUtils;


const config = require('../../config/keys');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');

const transporter = nodemailer.createTransport({
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  secure: false, // correct for 587 + STARTTLS
  auth: {
    user: config.email.auth.user,
    pass: config.email.auth.pass,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error('SMTP verify failed:', err);
    return;
  }
  console.log('Server is ready to send emails');
});

transporter.use(
  'compile',
  hbs({
    viewEngine: {
      extName: '.hbs',
      partialsDir: './src/emails/partials',
      layoutsDir: './src/emails/templates',
      defaultLayout: false,
    },
    viewPath: './src/emails/templates',
    extName: '.hbs',
  })
);

const CheckoutUtils = require('./CheckoutUtils');

const DEFAULT_STAFF_RECIPIENTS = [
  'sales@pgmoutfitters.com',
  'precisiongear@bellsouth.net',
  'kyle@cltdev.com',
];

// Production always uses the three addresses above. For a test-only list, set
// STAFF_EMAIL_OVERRIDE to a comma-separated list (e.g. kyle@cltdev.com).
function staffRecipients() {
  const override = (process.env.STAFF_EMAIL_OVERRIDE || '').trim();
  if (!override) {
    return DEFAULT_STAFF_RECIPIENTS;
  }
  const parsed = override.split(',').map((value) => value.trim()).filter(Boolean);
  return parsed.length ? parsed : DEFAULT_STAFF_RECIPIENTS;
}

const STAFF_RECIPIENTS = staffRecipients();

const PICKUP_ADDRESS = '908 Joseph St, Shreveport, LA 71107';
const PICKUP_PHONE = '(318) 227-8145';
// Copied from pgmoutfitters-client PR #6 src/components/cart.tsx (do not invent).
const PICKUP_MAPS_URL = 'https://www.google.com/maps/place/908+Joseph+St,+Shreveport,+LA+71107/@32.5293771,-93.7613823,750m/data=!3m2!1e3!4b1!4m6!3m5!1s0x8636ccd92aad605d:0xd962e00b360ec708!8m2!3d32.5293771!4d-93.7588074!16s%2Fg%2F11c1h99zbr?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D';
const FROM_ADDRESS = 'PGM Outfitters <noreply@pgmoutfitters.com>';

class EmailUtils {
  static formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  static capitalize(word) {
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }

  static async setRetailPricing(cart) {
    return cart
      .filter((item) => item.qty > 0)
      .map((item) => ({
        name: item.name,
        qty: item.qty,
        link: `https://pgmoutfitters.com/products/deer-feeders/${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        price: EmailUtils.formatter.format(Number(item.price.retail)),
      }));
  }

  static async sendStaffEmail(inquiry) {
    console.log('SEND EMAIL FUNCTION STARTED...');

    const newCart = await EmailUtils.setRetailPricing(inquiry.cart);

    const staffEmail = {
      from: 'PGM Outfitters Website Inquiry <noreply@pgmoutfitters.com>',
      to: STAFF_RECIPIENTS,
      subject: 'New Purchase Inquiry',
      template: 'staff',
      context: {
        layout: false, // important if you are not using a layout
        type: EmailUtils.capitalize(inquiry.type),
        company: inquiry.companyName,
        first: inquiry.firstName,
        last: inquiry.lastName,
        email: inquiry.email,
        phone: inquiry.phone,
        cart: newCart,
        cost: inquiry.cost,
      },
    };

    try {
      const info = await transporter.sendMail(staffEmail);
      console.log('Autoresponder successfully sent...', info.messageId);
      return info;
    } catch (err) {
      console.error('Staff autoresponder failed to send:', err);
      throw err;
    }
  }

  static orderEmailContext(order, heading) {
    const items = (order.items || []).map((item) => ({
      name: item.name,
      qty: item.qty,
      link: CheckoutUtils.productPageUrl(item.slug),
      price: EmailUtils.formatter.format(Number(item.unit_amount_cents) / 100),
    }));

    return {
      layout: false,
      heading,
      customerName: order.customerName || '',
      customerEmail: order.customerEmail || '',
      customerPhone: order.customerPhone || '',
      items,
      total: EmailUtils.formatter.format(Number(order.totalCents) / 100),
      pickupAddress: PICKUP_ADDRESS,
      pickupMapsUrl: PICKUP_MAPS_URL,
      pickupPhone: PICKUP_PHONE,
      orderId: order.id,
    };
  }

  static async sendOrderEmails(order) {
    const buyerContext = EmailUtils.orderEmailContext(order, 'Thanks for your order');
    const staffContext = EmailUtils.orderEmailContext(order, 'New Web Order');

    if (order.customerEmail) {
      try {
        const info = await transporter.sendMail({
          from: FROM_ADDRESS,
          to: order.customerEmail,
          subject: 'Your PGM Outfitters order',
          template: 'order',
          context: buyerContext,
        });
        console.log('Buyer order email sent...', info.messageId);
      } catch (err) {
        console.error('Buyer order email failed to send:', err);
        throw err;
      }
    }

    try {
      const info = await transporter.sendMail({
        from: FROM_ADDRESS,
        to: STAFF_RECIPIENTS,
        subject: 'New Web Order!',
        template: 'order',
        context: staffContext,
      });
      console.log('Staff order email sent...', info.messageId);
      return info;
    } catch (err) {
      console.error('Staff order email failed to send:', err);
      throw err;
    }
  }
}

module.exports = EmailUtils;