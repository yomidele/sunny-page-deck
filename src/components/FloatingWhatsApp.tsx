import { MessageCircle } from "lucide-react";

const FloatingWhatsApp = () => {
  const whatsappNumber = "234XXXXXXXXX"; // Replace with your WhatsApp number
  const whatsappURL = `https://wa.me/${whatsappNumber}?text=Hello,%20I%20need%20help%20with%20JAMB%20preparation.`;

  return (
    <a
      href={whatsappURL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover-lift group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
      <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-green-600 text-white text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap">
        Need help?
      </span>
    </a>
  );
};

export default FloatingWhatsApp;
