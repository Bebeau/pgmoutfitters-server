const config = require('../../config/keys');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const transporter = nodemailer.createTransport(config.email);
const handlebarOptions = config.email.template;

transporter.verify(function (err) {
  if (err) {
    return console.log(err);
  }
  return console.log("Server is ready to send emails");
});

transporter.use('compile', hbs(handlebarOptions));

class EmailUtils {
    static async setRetailPricing(cart) {
        let newCart = [];
        cart.forEach((item) => {
            if (item.qty > 0) {
                newCart.push({
                    name: item.name,
                    qty: item.qty,
                    link: `https://pgmoutfitters.com/products/deer-feeders/${item.name.toLowerCase()}`,
                    price: EmailUtils.formatter.format(Number(item.price.retail))
                });
            }
        });
        return newCart;
    }
    // static async setDealerPricing(cart) {
    //     let newCart = [];
    //     cart.forEach((item) => {
    //         if (item.qty > 0) {
    //             newCart.push({
    //                 name: item.name,
    //                 qty: item.qty,
    //                 link: `https://pgmoutfitters.com/products/deer-feeders/${item.name.toLowerCase()}`,
    //                 price: EmailUtils.formatter.format(Number(item.price.dealer))
    //             });
    //         }
    //     });
    //     return newCart;
    // }
    // static isDealerPricing(type, cart) {
    //     let totalInputValue = 0;
    //     cart.map((item) => {
    //         totalInputValue = Number(item.qty) + totalInputValue;
    //     });
    //     if (totalInputValue >= 5 && type !== 'hunter') {
    //         return true;
    //     }
    //     return false;
    // }
    static capitalize(word) {
        return word[0].toUpperCase() + word.slice(1).toLowerCase();
    }
    static formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    });
    static async sendStaffEmail(inquiry) {
        // const isDealerPricing = EmailUtils.isDealerPricing(inquiry.type, inquiry.cart);
        let newCart;
        newCart = await EmailUtils.setRetailPricing(inquiry.cart);
        // if (isDealerPricing) {
        //     newCart = await EmailUtils.setDealerPricing(inquiry.cart);
        // }
        const staffEmail = {
            from: 'PGM Outfitters Website Inquiry <noreply@pgmoutfitters.com>',
            to: 'sales@pgmoutfitters.com',
            subject: 'New Purchase Inquiry',
            template: 'staff',
            context: { 
                type: EmailUtils.capitalize(inquiry.type),
                company: inquiry.companyName,
                first: inquiry.firstName,
                last: inquiry.lastName,
                email: inquiry.email,
                phone: inquiry.phone,
                cart: newCart,
                cost: inquiry.cost
            }
        };

        return new Promise((resolve, reject) => {
            transporter.sendMail(staffEmail, (err) => {
                if (err) {
                    console.log(err);
                    reject('Staff autoresponder failed to send: ', err);
                }
                resolve();
            });
        });
    }
}

module.exports = EmailUtils;