import { api } from './api';

export interface LocalKnowledgeResult {
  content: string;
  sources?: { title: string; uri: string }[];
  files?: { id: string; name: string; url: string; unit?: string; category: string }[];
}

export interface QAPair {
  question: string;
  answer: string;
}

// User-provided StudyStack & Alex Q&A Dataset (100+ Question & Answer Pairs)
export const STUDYSTACK_QA_DATASET: QAPair[] = [
  {
    "question": "hello",
    "answer": "Hello! 👋 I'm Alex, your StudyStack AI Assistant. How can I help you today?"
  },
  {
    "question": "hi",
    "answer": "Hi! 👋 I'm Alex. How can I help you with StudyStack?"
  },
  {
    "question": "hey",
    "answer": "Hey! 👋 What can I help you find on StudyStack?"
  },
  {
    "question": "hey alex",
    "answer": "Hey! 👋 I'm Alex. What can I help you with?"
  },
  {
    "question": "good morning",
    "answer": "Good morning! ☀️ How can I help you with your studies today?"
  },
  {
    "question": "good afternoon",
    "answer": "Good afternoon! 👋 What can I help you find on StudyStack?"
  },
  {
    "question": "good evening",
    "answer": "Good evening! 👋 How can I help you today?"
  },
  {
    "question": "how are you",
    "answer": "I'm doing great! 😊 I'm ready to help you with StudyStack."
  },
  {
    "question": "who are you",
    "answer": "I'm Alex 🤖, your StudyStack AI Study Assistant. I can help you find resources and navigate StudyStack."
  },
  {
    "question": "what is your name",
    "answer": "My name is Alex! 🤖 I'm the AI Study Assistant inside StudyStack."
  },
  {
    "question": "what is studystack",
    "answer": "StudyStack is an academic resource platform where students can access assignments, notes, lab resources, previous papers, and other study materials."
  },
  {
    "question": "what can you do",
    "answer": "I can help you find PDFs, notes, assignments, lab resources, previous papers, search for study materials, contact your administrator, and report problems."
  },
  {
    "question": "what can alex do",
    "answer": "I can help you navigate StudyStack, find academic resources, locate PDFs, notes, assignments, lab resources, and previous papers, and guide you when you have a problem."
  },
  {
    "question": "where are the pdfs",
    "answer": "You can find PDFs in the relevant StudyStack resource section. You can also use the search bar to find a PDF by its title, subject, or keyword."
  },
  {
    "question": "where are the pdf files",
    "answer": "PDF resources are organized inside the appropriate StudyStack sections. Use Search to quickly locate a specific PDF."
  },
  {
    "question": "where can i find pdfs",
    "answer": "Check the relevant resource section or use the StudyStack search bar to find PDFs by subject or title."
  },
  {
    "question": "where did the pdf go",
    "answer": "Try searching for the PDF using its title, subject, or keyword. You can also check the relevant resource section."
  },
  {
    "question": "i can't find the pdf",
    "answer": "Try searching with the PDF title, subject name, or a shorter keyword. If you still cannot find it, contact your administrator."
  },
  {
    "question": "where are the uploaded pdfs",
    "answer": "Available PDFs are stored in the relevant StudyStack resource sections. Use Search to locate a specific PDF."
  },
  {
    "question": "where can i see the pdf",
    "answer": "Open the relevant StudyStack resource section and select the PDF you want to view."
  },
  {
    "question": "how do i open a pdf",
    "answer": "Find the PDF in the appropriate StudyStack section and select it to open or preview it."
  },
  {
    "question": "how can i view a pdf",
    "answer": "Find the required PDF and select it to open or preview it."
  },
  {
    "question": "how do i download a pdf",
    "answer": "Open the required PDF resource and select the available Download option."
  },
  {
    "question": "where is the download button",
    "answer": "Open the resource you want to download and look for the available Download option."
  },
  {
    "question": "pdf is not downloading",
    "answer": "Check your internet connection and try again. If the problem continues, report it using Report Problem or contact your administrator."
  },
  {
    "question": "pdf is not opening",
    "answer": "Try refreshing the page and opening the PDF again. If it still does not open, report the issue using Report Problem."
  },
  {
    "question": "the pdf is blank",
    "answer": "Try refreshing and reopening the PDF. If it remains blank, report the issue to your administrator."
  },
  {
    "question": "the pdf link is broken",
    "answer": "Please report the broken resource using Report Problem and mention the PDF or subject name."
  },
  {
    "question": "where are my notes",
    "answer": "Open the Notes section from the StudyStack dashboard to access available notes."
  },
  {
    "question": "where can i find notes",
    "answer": "Go to the Notes section or search for your subject using the StudyStack search bar."
  },
  {
    "question": "where are the notes",
    "answer": "You can find available notes in the Notes section of StudyStack."
  },
  {
    "question": "bro where are the notes",
    "answer": "Check the Notes section 😄. You can also search for your subject using the search bar."
  },
  {
    "question": "i need notes",
    "answer": "Sure! Search for your subject in StudyStack or open the Notes section."
  },
  {
    "question": "where can i get notes for my subject",
    "answer": "Search for your subject using the StudyStack search bar or check the Notes section."
  },
  {
    "question": "where are unit notes",
    "answer": "Search for the subject and unit name using the StudyStack search bar."
  },
  {
    "question": "where are semester notes",
    "answer": "Open Notes and search using your subject or semester-related keywords."
  },
  {
    "question": "i can't find my notes",
    "answer": "Try searching with the complete subject name or a shorter keyword. If the notes are still unavailable, contact your administrator."
  },
  {
    "question": "do we have notes for this subject",
    "answer": "Search for the subject in StudyStack to check whether notes are available."
  },
  {
    "question": "where are my assignments",
    "answer": "Open the Assignments section from the StudyStack dashboard."
  },
  {
    "question": "where can i see assignments",
    "answer": "Go to the Assignments section to view available assignment resources."
  },
  {
    "question": "where is my assignment",
    "answer": "Check the Assignments section or search for the assignment using its subject or title."
  },
  {
    "question": "i can't find my assignment",
    "answer": "Search for the assignment using its subject or title. If you still cannot find it, contact your administrator."
  },
  {
    "question": "where can i download my assignment",
    "answer": "Open the required assignment in the Assignments section and use the available download option."
  },
  {
    "question": "can i find assignments by subject",
    "answer": "Yes. Search using the subject name or assignment title."
  },
  {
    "question": "where are old assignments",
    "answer": "Search the Assignments section using the subject or assignment name."
  },
  {
    "question": "where are lab resources",
    "answer": "Open the Lab Resources section from the StudyStack dashboard."
  },
  {
    "question": "where are lab manuals",
    "answer": "Open Lab Resources to find available lab manuals and practical resources."
  },
  {
    "question": "where are lab pdfs",
    "answer": "Check Lab Resources for available laboratory PDFs and manuals."
  },
  {
    "question": "where can i find lab programs",
    "answer": "Search the Lab Resources section using your subject or laboratory name."
  },
  {
    "question": "i need my lab manual",
    "answer": "Open Lab Resources and search for your laboratory subject."
  },
  {
    "question": "where are practical materials",
    "answer": "Check the Lab Resources section for practical guides and related materials."
  },
  {
    "question": "where are lab notes",
    "answer": "Check Lab Resources and Notes for available laboratory study materials."
  },
  {
    "question": "i can't find my lab material",
    "answer": "Try searching using the lab subject name. If it is unavailable, contact your administrator."
  },
  {
    "question": "where are pyqs",
    "answer": "Open the Previous Papers section to access available previous-year question papers."
  },
  {
    "question": "where are previous papers",
    "answer": "Open the Previous Papers section to find available previous examination papers."
  },
  {
    "question": "where can i find previous papers",
    "answer": "Go to Previous Papers and search for your subject."
  },
  {
    "question": "bro where are the previous papers",
    "answer": "They're in the Previous Papers section 😄. You can also search for a specific subject."
  },
  {
    "question": "where can i find old question papers",
    "answer": "Open Previous Papers or search for your subject using the StudyStack search bar."
  },
  {
    "question": "do we have previous year papers",
    "answer": "Check the Previous Papers section to see the papers currently available."
  },
  {
    "question": "where are semester question papers",
    "answer": "Check the Previous Papers section and search using your subject name."
  },
  {
    "question": "where are mid papers",
    "answer": "Available Mid examination papers can be found in the Previous Papers section."
  },
  {
    "question": "where can i find previous mid papers",
    "answer": "Open Previous Papers and search for your subject or examination type."
  },
  {
    "question": "i need pyqs for my exam",
    "answer": "Search for your subject in Previous Papers to find available PYQs."
  },
  {
    "question": "can i download previous papers",
    "answer": "Yes, if downloading is enabled, open the paper and select Download."
  },
  {
    "question": "i can't find the pyq i need",
    "answer": "Try different search keywords. If the paper is still unavailable, contact your administrator."
  },
  {
    "question": "how do i search",
    "answer": "Use the search bar on the StudyStack dashboard and enter the subject, topic, resource name, or keyword."
  },
  {
    "question": "where is the search bar",
    "answer": "The StudyStack search bar is available near the top of the dashboard."
  },
  {
    "question": "how can i search for a pdf",
    "answer": "Use the search bar and enter the PDF title, subject, or a relevant keyword."
  },
  {
    "question": "can i search by subject",
    "answer": "Yes. Search using the subject name or a subject-related keyword."
  },
  {
    "question": "can i search for previous papers",
    "answer": "Yes. Search for the subject or paper name, or open the Previous Papers section directly."
  },
  {
    "question": "search is not finding my file",
    "answer": "Try a shorter keyword, the subject name, or part of the resource title. If you still cannot find it, contact your administrator."
  },
  {
    "question": "i don't know where to find something",
    "answer": "Tell me what you're looking for and I'll guide you to the appropriate StudyStack section."
  },
  {
    "question": "where can i find all resources",
    "answer": "Use the StudyStack dashboard sections or the main search bar to explore available resources."
  },
  {
    "question": "what resources are available",
    "answer": "StudyStack provides Assignments, Notes, Lab Resources, and Previous Papers, along with search and support features."
  },
  {
    "question": "how do i contact my admin",
    "answer": "Use the Messages section to contact your administrator."
  },
  {
    "question": "how can i contact the administrator",
    "answer": "Open Messages and send your query to the administrator."
  },
  {
    "question": "i need to talk to admin",
    "answer": "Open Messages and send your message to the administrator."
  },
  {
    "question": "how can i message the administrator",
    "answer": "Go to Messages and send your query to the administrator."
  },
  {
    "question": "where is the admin contact",
    "answer": "Use the Messages option on the StudyStack dashboard to contact your administrator."
  },
  {
    "question": "i have a problem",
    "answer": "I'm here to help! If it's a StudyStack issue, you can also use Report Problem or contact your administrator through Messages."
  },
  {
    "question": "how do i report a problem",
    "answer": "Click the Report Problem option on the StudyStack dashboard and provide details about the issue."
  },
  {
    "question": "where do i report a problem",
    "answer": "Use the Report Problem option available on the StudyStack dashboard."
  },
  {
    "question": "something is not working",
    "answer": "Try refreshing the page first. If the problem continues, use Report Problem or contact your administrator."
  },
  {
    "question": "who do i contact if a resource is missing",
    "answer": "Contact your administrator through Messages or use Report Problem."
  },
  {
    "question": "i need a pdf that is not available",
    "answer": "Try searching again using the subject or topic name. If the PDF is still unavailable, contact your administrator and request the resource."
  },
  {
    "question": "the notes i need are not there",
    "answer": "Try searching with different keywords or the complete subject name. If the notes are unavailable, contact your administrator."
  },
  {
    "question": "the previous paper i need is missing",
    "answer": "Try searching with the subject and examination details. If you still cannot find it, contact your administrator."
  },
  {
    "question": "how do i use alex",
    "answer": "Click Alex to open the AI Study Assistant. You can type your question or use the microphone when voice input is enabled."
  },
  {
    "question": "can i talk to alex",
    "answer": "Yes! You can type to Alex or use the microphone when voice input is enabled."
  },
  {
    "question": "can i use the microphone",
    "answer": "Yes. If microphone access is enabled, you can use your voice to communicate with Alex."
  },
  {
    "question": "can alex speak",
    "answer": "Yes. When voice output is enabled, Alex can speak his responses."
  },
  {
    "question": "is alex online",
    "answer": "Alex normally uses Gemini for advanced AI responses. If Gemini is unavailable, Alex can continue helping with supported StudyStack questions using Offline Mode."
  },
  {
    "question": "why is alex offline",
    "answer": "The Gemini connection may currently be unavailable. Alex has switched to Offline Mode so he can still help with supported StudyStack questions."
  },
  {
    "question": "can alex work without internet",
    "answer": "Yes. In Offline Mode, Alex can answer supported questions using the local StudyStack knowledge base."
  },
  {
    "question": "what can alex do offline",
    "answer": "Offline Alex can help with StudyStack navigation, PDFs, notes, assignments, lab resources, previous papers, search, and basic support questions."
  },
  {
    "question": "are you gemini",
    "answer": "I'm Alex, the AI assistant inside StudyStack. Gemini may power my advanced responses when the connection is available."
  },
  {
    "question": "thank you",
    "answer": "You're very welcome! 😊 I'm always happy to help."
  },
  {
    "question": "thanks alex",
    "answer": "You're welcome! 😊 Good luck with your studies!"
  },
  {
    "question": "bye",
    "answer": "Goodbye! 👋 Good luck with your studies!"
  },
  {
    "question": "see you",
    "answer": "See you later! 👋 Keep studying and good luck!"
  },
  {
    "question": "help me",
    "answer": "Of course! 👋 I can help you find PDFs, notes, assignments, lab resources, previous papers, or contact your administrator."
  },
  {
    "question": "i need help",
    "answer": "Sure! Tell me what you're looking for, such as notes, PDFs, assignments, lab resources, or previous papers."
  },
  {
    "question": "bro help me",
    "answer": "Sure bro! 😄 Tell me what you need help finding on StudyStack."
  },
  {
    "question": "bro where r the pdfs",
    "answer": "You can find the PDFs in the relevant StudyStack resource section. Try searching by subject or PDF name."
  },
  {
    "question": "where r notes",
    "answer": "Check the Notes section or search for your subject."
  },
  {
    "question": "where is pyq",
    "answer": "Open Previous Papers to find available PYQs."
  },
  {
    "question": "where is my assignment",
    "answer": "Check the Assignments section or search for the assignment name."
  },
  {
    "question": "i need previous papers",
    "answer": "Sure! Go to Previous Papers and search for your subject."
  },
  {
    "question": "admin ni ela contact avvali",
    "answer": "You can contact your administrator through the Messages section."
  },
  {
    "question": "admin ki message ela cheyali",
    "answer": "Open Messages and send your query to the administrator."
  },
  {
    "question": "pdf open avvatledu",
    "answer": "Try refreshing the page and opening the PDF again. If it still doesn't work, use Report Problem."
  },
  {
    "question": "download avvatledu",
    "answer": "Check your internet connection and try again. If the problem continues, report it to the administrator."
  },
  {
    "question": "subject kanipinchadam ledu",
    "answer": "Try searching using the complete subject name or a keyword. If it is still unavailable, contact the administrator."
  },
  {
    "question": "emaina notes unnaya",
    "answer": "Search for your subject in StudyStack to see whether notes are available."
  },
  {
    "question": "exam ki papers kavali",
    "answer": "Check Previous Papers and search for your subject to find available examination papers."
  },
  {
    question: "i want to contact your admin",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "how can i contact your admin",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "i want to contact the admin",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "how do i contact the admin",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "can i contact your admin",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "i need to talk to the admin",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "i need admin contact",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "give me admin number",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "what is the admin phone number",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  },
  {
    question: "admin contact number please",
    answer: "Sure! My admin is Kasi Viswanadh. You can contact him at 8019450361."
  }
];

// Helper to normalize user string for comparison
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
}

export async function queryLocalKnowledgeBase(queryText: string): Promise<LocalKnowledgeResult> {
  const normalizedQuery = normalizeText(queryText);

  // 1. Search live Supabase Database for matching files using Hybrid Search Engine
  try {
    const searchResult = await api.searchFiles(queryText);
    const foundFiles = (searchResult.files || []).map((f: any) => ({
      id: f.id,
      name: f.file_name,
      url: f.file_url,
      unit: f.unit_no,
      category: f.category,
      subject_name: f.subject_name
    }));

    if (foundFiles.length > 0) {
      return {
        content: `I found **${foundFiles.length} academic resource(s)** matching your query:`,
        files: foundFiles
      };
    }
  } catch (err) {
    console.warn("Local DB search failed:", err);
  }

  // 2. Direct / Exact & High Confidence Match against Q&A Dataset (for greetings, support, FAQs)
  if (normalizedQuery) {
    let bestMatch: QAPair | null = null;
    let highestScore = 0;

    for (const item of STUDYSTACK_QA_DATASET) {
      const qNorm = normalizeText(item.question);

      // Exact match
      if (normalizedQuery === qNorm) {
        bestMatch = item;
        break;
      }

      // High confidence inclusion match (question is fully contained in normalized query or vice versa)
      if ((normalizedQuery.includes(qNorm) || qNorm.includes(normalizedQuery)) && qNorm.length > 3) {
        const score = qNorm.length;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      }
    }

    if (bestMatch) {
      return {
        content: bestMatch.answer
      };
    }
  }

  // 3. General Fallback
  return {
    content: `Hi! I'm Alex 👋

**Here is what I can help you find on StudyStack:**
• **Notes & PDFs**: Ask for subjects like *Operating Systems*, *Python*, *Cloud Computing*, *Computer Networks*, or *Deep Learning*.
• **Assignments & Lab Manuals**: Browse Assignments, Lab Resources, or Previous Papers.
• **Support**: Ask how to contact admin or report a problem!

How can I assist you today?`
  };
}
