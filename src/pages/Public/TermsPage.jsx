import { useEffect } from 'react'

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Terms and Conditions</h1>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          Welcome to Megadie. By using our website or purchasing products from us, you
          agree to be bound by these Terms and Conditions. Please read them carefully.
        </p>

        <h2 className="text-base font-semibold text-slate-900">1. General</h2>
        <p>
          1.1 These Terms apply to all visitors, users, and customers of Megadie ("we," "us,"
          or "our") at megadie.com.
        </p>
        <p>
          1.2 By accessing our website or making a purchase, you confirm that you have
          read, understood, and agree to these Terms. If you do not agree, you must not
          use our website.
        </p>

        <h2 className="text-base font-semibold text-slate-900">2. Product Information</h2>
        <p>
          2.1 Product details, including descriptions and images, are provided for general
          information purposes only and may be subject to change at any time without notice.
        </p>
        <p>
          2.2 All products are sold "as is" without any guarantees or warranties, either
          express or implied, regarding their suitability, availability, or use for any
          specific purpose.
        </p>

        <h2 className="text-base font-semibold text-slate-900">3. Orders and Payment</h2>
        <p>
          3.1 By placing an order on our website, you make an offer to purchase the products
          selected. All orders are subject to our approval, which may be withheld at our
          discretion.
        </p>
        <p>
          3.2 We reserve the right to cancel or refuse any order for any reason, including
          but not limited to pricing or stock errors, or any issue with payment authorization.
        </p>
        <p>
          3.3 Payment must be completed at the time of purchase using one of the available
          payment methods. Any issues related to payment processing are your sole responsibility.
        </p>

        <h2 className="text-base font-semibold text-slate-900">4. Shipping and Delivery</h2>
        <p>
          4.1 We deliver to locations within the UAE. Shipping fees and delivery times may
          vary depending on the delivery address and chosen shipping method. Delivery times
          are estimates and are not guaranteed.
        </p>
        <p>
          4.2 Once products are handed over to the shipping carrier, all risk of loss or
          damage passes to you. We are not liable for any delays, damages, or issues caused
          by third-party carriers.
        </p>
        <p>
          4.3 It is your responsibility to provide a correct delivery address. We will not
          be responsible for any loss or additional costs incurred due to incorrect address
          information.
        </p>

        <h2 className="text-base font-semibold text-slate-900">5. Returns and Refunds</h2>
        <p>
          5.1 Returns may be accepted at our sole discretion, and we do not guarantee
          acceptance of any returns. Any request for a return must be made promptly upon
          receipt of the product.
        </p>
        <p>
          5.2 If no immediate complaints are raised upon delivery, it will be considered
          that the product has been received in good condition.
        </p>
        <p>
          5.3 Refunds, if applicable, will be processed at our discretion after inspecting
          the returned product(s). Return shipping costs are your responsibility unless the
          return is due to a fault on our part.
        </p>
        <p>5.4 We reserve the right to refuse any return that does not meet our policy requirements.</p>

        <h2 className="text-base font-semibold text-slate-900">6. Intellectual Property</h2>
        <p>
          6.1 All content on this website, including text, images, logos, and graphics, is
          owned by Megadie or its content suppliers and is protected by applicable intellectual
          property laws.
        </p>
        <p>
          6.2 Unauthorized use, copying, distribution, or modification of any content from
          this website is strictly prohibited.
        </p>

        <h2 className="text-base font-semibold text-slate-900">7. Privacy</h2>
        <p>
          7.1 Your use of our website is subject to our Privacy Policy. We do not guarantee
          the security or confidentiality of any data you provide, and we shall not be
          liable for any unauthorized access or breaches.
        </p>

        <h2 className="text-base font-semibold text-slate-900">8. Limitation of Liability</h2>
        <p>
          8.1 To the maximum extent permitted by law, Megadie shall not be liable for any
          direct, indirect, incidental, special, or consequential damages arising from your
          use of our website, its content, or your purchase of products from us.
        </p>
        <p>
          8.2 Our total liability to you for any claim arising from your use of the website
          or purchase of products shall not exceed the amount you paid for the product(s) in
          question.
        </p>
        <p>
          8.3 You agree to indemnify, defend, and hold Megadie harmless from any claims,
          damages, losses, liabilities, costs, or expenses arising from your use of our
          website or violation of these Terms.
        </p>

        <h2 className="text-base font-semibold text-slate-900">
          9. Governing Law and Dispute Resolution
        </h2>
        <p>
          9.1 These Terms and Conditions are governed by and construed in accordance with
          the laws of the United Arab Emirates. Any disputes arising out of or in connection
          with these Terms shall be resolved through good-faith negotiation. If a resolution
          cannot be reached, the dispute shall be referred to the court.
        </p>

        <h2 className="text-base font-semibold text-slate-900">10. Changes to These Terms</h2>
        <p>
          10.1 We reserve the right to modify or update these Terms at any time without
          prior notice. Changes will be effective immediately upon posting on our website.
          Your continued use of the website after changes are posted constitutes your
          acceptance of those changes.
        </p>

        <h2 className="text-base font-semibold text-slate-900">11. Contact Information</h2>
        <p>
          For any inquiries or concerns regarding these Terms and Conditions, please use
          the contact form available on our website.
        </p>
      </div>
    </div>
  )
}
