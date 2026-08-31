
console.log("🚀 بدأ تشغيل Rased AI Server...");

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const API_KEY = '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';

const USERS_FILE = path.join(__dirname, 'users.json');
const DEMO_REQUESTS_FILE = path.join(__dirname, 'demo_requests.json');

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('خطأ في قراءة ملف المستخدمين:', error);
    return [];
  }
}

function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('خطأ في كتابة ملف المستخدمين:', error);
    return false;
  }
}

function readDemoRequests() {
  try {
    if (!fs.existsSync(DEMO_REQUESTS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DEMO_REQUESTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('خطأ في قراءة ملف طلبات العرض التوضيحي:', error);
    return [];
  }
}

function writeDemoRequests(requests) {
  try {
    fs.writeFileSync(DEMO_REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('خطأ في كتابة ملف طلبات العرض التوضيحي:', error);
    return false;
  }
}

app.post('/register', function(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
  }

  const users = readUsers();

  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'يوجد حساب بهذا البريد الإلكتروني مسبقاً' });
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password,
    registrationDate: new Date().toISOString(),
    projects: [],
    chatHistory: []
  };

  users.push(newUser);

  if (writeUsers(users)) {
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حفظ الحساب' });
  }
});

app.post('/login', function(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }

  const users = readUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }
});

app.post('/add-project', function(req, res) {
  const { userId, project } = req.body;

  if (!userId || !project) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم والمشروع مطلوبان' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  const user = users[userIndex];
  const subscription = user.subscription || 'free';

  if (subscription === 'free' && user.projects.length >= 3) {
    return res.status(403).json({ 
      success: false, 
      message: 'تم الوصول للحد الأقصى من المشاريع في الخطة المجانية (3 مشاريع)',
      requiresUpgrade: true 
    });
  }

  const newProject = {
    ...project,
    id: Date.now().toString(),
    date: new Date().toISOString()
  };

  users[userIndex].projects.push(newProject);

  if (writeUsers(users)) {
    res.json({ success: true, project: newProject });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حفظ المشروع' });
  }
});

app.get('/projects/:userId', function(req, res) {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
  }

  const users = readUsers();
  const user = users.find(u => u.id === userId);

  if (user) {
    res.json({ success: true, projects: user.projects });
  } else {
    res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }
});

app.post('/save-chat', function(req, res) {
  const { userId, message, isUser } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم والرسالة مطلوبان' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  const chatMessage = {
    id: Date.now().toString(),
    message,
    isUser,
    timestamp: new Date().toISOString()
  };

  users[userIndex].chatHistory.push(chatMessage);

  if (users[userIndex].chatHistory.length > 100) {
    users[userIndex].chatHistory.splice(0, users[userIndex].chatHistory.length - 100);
  }

  if (writeUsers(users)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حفظ الرسالة' });
  }
});

app.get('/chat-history/:userId', function(req, res) {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
  }

  const users = readUsers();
  const user = users.find(u => u.id === userId);

  if (user) {
    res.json({ success: true, chatHistory: user.chatHistory });
  } else {
    res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }
});

app.put('/update-project', function(req, res) {
  const { userId, projectId, project } = req.body;

  if (!userId || !projectId || !project) {
    return res.status(400).json({ success: false, message: 'جميع البيانات مطلوبة' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  const projectIndex = users[userIndex].projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
  }

  const updatedProject = {
    ...project,
    id: projectId,
    date: users[userIndex].projects[projectIndex].date,
    lastModified: new Date().toISOString()
  };

  users[userIndex].projects[projectIndex] = updatedProject;

  if (writeUsers(users)) {
    res.json({ success: true, project: updatedProject });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حفظ التحديثات' });
  }
});

app.post('/demo-request', function(req, res) {
  const { name, whatsapp, company, activityType, preferredTime, notes } = req.body;

  if (!name || !whatsapp) {
    return res.status(400).json({ success: false, message: 'الاسم ورقم الواتساب مطلوبان' });
  }

  const demoRequests = readDemoRequests();

  const newRequest = {
    id: Date.now().toString(),
    name,
    whatsapp,
    company: company || '',
    activityType: activityType || '',
    preferredTime: preferredTime || '',
    notes: notes || '',
    status: 'pending',
    requestDate: new Date().toISOString()
  };

  demoRequests.push(newRequest);

  if (writeDemoRequests(demoRequests)) {
    console.log(`📞 طلب عرض توضيحي جديد من: ${name} - واتساب: ${whatsapp} - شركة: ${company || 'غير محدد'}`);
    res.json({ success: true, request: newRequest });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حفظ الطلب' });
  }
});

app.get('/demo-requests', function(req, res) {
  const demoRequests = readDemoRequests();
  res.json({ success: true, requests: demoRequests });
});

function checkChatLimits(userId) {
  const users = readUsers();
  const user = users.find(u => u.id === userId);

  if (!user) return { allowed: false, message: 'المستخدم غير موجود' };

  const subscription = user.subscription || 'free';
  const today = new Date().toDateString();
  const todayChats = user.chatHistory.filter(chat => 
    new Date(chat.timestamp).toDateString() === today && chat.isUser
  ).length;

  if (subscription === 'free' && todayChats >= 10) {
    return { 
      allowed: false, 
      message: 'تم الوصول للحد الأقصى من الرسائل اليومية (10 رسائل). قم بالترقية للحصول على رسائل غير محدودة.',
      requiresUpgrade: true 
    };
  }

  return { allowed: true };
}

app.post('/chat', async function(req, res) {
  const { message: userMessage, userId, language } = req.body;
  console.log("📩 استُقبلت رسالة من المستخدم:", userMessage);

  if (userId) {
    const limitCheck = checkChatLimits(userId);
    if (!limitCheck.allowed) {
      return res.status(403).json({ 
        reply: limitCheck.message,
        requiresUpgrade: limitCheck.requiresUpgrade 
      });
    }
  }

  try {
    // تحديد اللغة والسياق حسب طلب المستخدم
    const isEnglish = language === 'en' || userMessage.toLowerCase().includes('english') || userMessage.toLowerCase().includes('translate');
    
    const systemContent = isEnglish ? 
      `You are Rased AI, a professional and intelligent assistant specialized in supporting entrepreneurs and startups in Algeria. 
      You use quantitative economics concepts in your analyses, consider the local Algerian market context, Central Bank policies, and small and medium enterprise financing methods.
      Respond professionally, ask smart questions to understand the project before providing advice, and don't make false promises.
      Focus on realistic analysis and guide users to make sound financial decisions. Respond in English when requested.` :
      `أنت Rased AI، مساعد ذكي ومهني ناطق بالعربية، متخصص في دعم رواد الأعمال والمشاريع الناشئة في الجزائر.
      تستخدم في تحليلاتك مفاهيم الاقتصاد الكمي، وتُراعي سياق السوق المحلي الجزائري، وسياسات البنك المركزي، وأساليب تمويل المشاريع الصغيرة والمتوسطة.
      تجاوب باحتراف، واطرح أسئلة ذكية لفهم المشروع قبل تقديم نصائح، ولا تقدم وعودًا وهمية.
      ركّز على التحليل الواقعي، وتوجيه المستخدم لاتخاذ قرارات مالية صحيحة.`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'gryphe/mythomax-l2-13b',
        messages: [
          {
            role: 'system',
            content: systemContent
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    console.log("🤖 رد Rased AI:", reply);
    res.json({ reply, language: isEnglish ? 'en' : 'ar' });

  } catch (error) {
    console.error("❌ خطأ أثناء الاتصال بـ OpenRouter:");
    console.error(error.response?.data || error.message);
    res.status(500).json({ reply: "⚠️ حدث خطأ أثناء الاتصال بـ Rased AI. تحقق من الاتصال أو من المفتاح." });
  }
});

app.post('/analyze-excel', async function(req, res) {
  const { fileData, fileName, fileType, userId, language } = req.body;

  if (!fileData || !fileName) {
    return res.status(400).json({ success: false, message: 'بيانات الملف واسم الملف مطلوبان' });
  }

  try {
    const basicAnalysis = analyzeExcelData(fileData, fileType, fileName);
    const analysisPrompt = createAnalysisPrompt(fileData, fileType, fileName, basicAnalysis, language || 'ar');

    console.log("🔍 إرسال البيانات للتحليل الذكي...");

    const aiResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'gryphe/mythomax-l2-13b',
        messages: [
          {
            role: 'system',
            content: `أنت خبير تحليل مالي ومختص في البيانات التجارية. تقوم بتحليل ملفات Excel وتقديم توصيات مفصلة وعملية. 
            اكتب تحليلك باللغة العربية وركز على النصائح العملية والقابلة للتطبيق في السوق الجزائري.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiAnalysis = aiResponse.data.choices[0].message.content;

    const completeAnalysis = {
      ...basicAnalysis,
      aiRecommendations: aiAnalysis,
      detailedInsights: parseAIRecommendations(aiAnalysis),
      analysisDate: new Date().toISOString()
    };

    if (userId) {
      await saveAnalysisToUser(userId, completeAnalysis);
    }

    console.log("✅ تم إكمال التحليل الذكي");
    res.json({ success: true, analysis: completeAnalysis });

  } catch (error) {
    console.error("❌ خطأ في التحليل الذكي:", error);
    res.status(500).json({ 
      success: false, 
      message: "حدث خطأ أثناء التحليل الذكي",
      basicAnalysis: analyzeExcelData(fileData, fileType, fileName)
    });
  }
});

function analyzeExcelData(data, fileType, fileName) {
  const headers = Object.keys(data[0] || {});
  const totalRecords = data.length;

  const amountColumns = headers.filter(h => 
    h.toLowerCase().includes('amount') || 
    h.includes('مبلغ') || 
    h.includes('قيمة') ||
    h.toLowerCase().includes('price') ||
    h.includes('سعر')
  );

  const dateColumns = headers.filter(h => 
    h.toLowerCase().includes('date') || 
    h.includes('تاريخ') ||
    h.toLowerCase().includes('time')
  );

  const nameColumns = headers.filter(h => 
    h.toLowerCase().includes('name') || 
    h.includes('اسم') ||
    h.toLowerCase().includes('product') ||
    h.includes('منتج') ||
    h.toLowerCase().includes('item')
  );

  let totalAmount = 0;
  let averageAmount = 0;
  let maxAmount = 0;
  let minAmount = Infinity;

  if (amountColumns.length > 0) {
    const amounts = data.map(row => parseFloat(row[amountColumns[0]]) || 0);
    totalAmount = amounts.reduce((sum, val) => sum + val, 0);
    averageAmount = totalAmount / amounts.length;
    maxAmount = Math.max(...amounts);
    minAmount = Math.min(...amounts);
  }

  return {
    fileName,
    fileType,
    totalRecords,
    headers,
    amountColumns,
    dateColumns,
    nameColumns,
    statistics: {
      totalAmount,
      averageAmount,
      maxAmount,
      minAmount: minAmount === Infinity ? 0 : minAmount
    },
    dataPreview: data.slice(0, 3)
  };
}

function createAnalysisPrompt(data, fileType, fileName, basicAnalysis, language = 'ar') {
  const fileTypeNames = {
    ar: {
      'sales': 'المبيعات',
      'expenses': 'المصاريف',
      'employees': 'الموظفين',
      'budget': 'الميزانية',
      'marketing': 'التسويق',
      'project_info': 'معلومات المشروع',
      'general': 'عام'
    },
    en: {
      'sales': 'Sales',
      'expenses': 'Expenses',
      'employees': 'Employees',
      'budget': 'Budget',
      'marketing': 'Marketing',
      'project_info': 'Project Information',
      'general': 'General'
    }
  };

  // تحليل أعمق للبيانات
  const detailedStats = analyzeDataPatterns(data, basicAnalysis);

  if (language === 'en') {
    return `You are Rased AI, a professional financial analysis expert and business consultant specialized in the Algerian market. Please provide a comprehensive and detailed analysis of this Excel file in English:

🏢 Company Information:
- File Name: ${fileName}
- Data Type: ${fileTypeNames[language][fileType] || fileType}
- Record Count: ${basicAnalysis.totalRecords}
- Available Columns: ${basicAnalysis.headers.join(', ')}

📊 Quantitative Analysis:
- Total Amount: ${basicAnalysis.statistics.totalAmount.toLocaleString()} DZD
- Average Amount: ${basicAnalysis.statistics.averageAmount.toLocaleString()} DZD
- Highest Amount: ${basicAnalysis.statistics.maxAmount.toLocaleString()} DZD
- Lowest Amount: ${basicAnalysis.statistics.minAmount.toLocaleString()} DZD
- Data Variance: ${detailedStats.variance}
- General Trend: ${detailedStats.trend}
- Data Quality: ${detailedStats.dataQuality}
- Data Completeness: ${detailedStats.completeness}%

📋 Detailed Data Sample:
${JSON.stringify(basicAnalysis.dataPreview, null, 2)}

Please provide a comprehensive analysis in English including:

📈 1. ADVANCED FINANCIAL ANALYSIS:
- Profitability analysis and financial ratios
- Liquidity assessment and cash flow indicators
- Comparison with Algerian industry benchmarks
- Cost structure analysis
- Revenue patterns and seasonality

⚠️ 2. RISK AND OPPORTUNITY ASSESSMENT:
- Financial risks identification
- Market opportunities in Algeria
- Operational vulnerabilities
- External economic threats
- Currency and inflation considerations

💡 3. STRATEGIC RECOMMENDATIONS (8-12 specific actions):
- Immediate actions (1-3 months)
- Short-term strategies (3-6 months)
- Medium-term goals (6-12 months)
- Long-term vision (1-3 years)
- Algeria market-specific recommendations

🎯 4. KEY PERFORMANCE INDICATORS (KPIs):
- Financial KPIs to monitor
- Operational metrics
- Market performance indicators
- Recommended targets and benchmarks

📊 5. BUSINESS IMPROVEMENT PLAN:
- Revenue optimization strategies
- Cost reduction opportunities
- Operational efficiency improvements
- Technology adoption recommendations
- Staff productivity enhancement

💰 6. FINANCIAL RECOMMENDATIONS:
- Working capital optimization
- Financing options available in Algeria
- Investment priorities
- Tax optimization strategies
- Banking relationships

🔍 7. MARKET POSITION ANALYSIS:
- Competitive landscape assessment
- Market share opportunities
- Differentiation strategies
- Customer segment analysis
- Growth potential evaluation

📈 8. GROWTH AND EXPANSION STRATEGY:
- Scaling opportunities
- New market penetration
- Product/service diversification
- Partnership opportunities
- Export potential

Present your analysis in a professional, structured format with clear sections and actionable insights. Focus on practical recommendations that can be implemented in the Algerian business context, considering local regulations, market conditions, and economic factors.`;
  }

  return `أنت خبير تحليل مالي ومستشار أعمال متخصص في السوق الجزائري. قم بتحليل هذا الملف بشكل شامل ومفصل:

🏢 معلومات المؤسسة:
- اسم الملف: ${fileName}
- نوع البيانات: ${fileTypeNames[language][fileType] || fileType}
- عدد السجلات: ${basicAnalysis.totalRecords}
- الأعمدة المتاحة: ${basicAnalysis.headers.join(', ')}

📊 التحليل الكمي:
- إجمالي المبالغ: ${basicAnalysis.statistics.totalAmount.toLocaleString()} دج
- متوسط المبلغ: ${basicAnalysis.statistics.averageAmount.toLocaleString()} دج
- أعلى مبلغ: ${basicAnalysis.statistics.maxAmount.toLocaleString()} دج
- أقل مبلغ: ${basicAnalysis.statistics.minAmount.toLocaleString()} دج
- التباين في البيانات: ${detailedStats.variance}
- الاتجاه العام: ${detailedStats.trend}

📋 عينة تفصيلية من البيانات:
${JSON.stringify(basicAnalysis.dataPreview, null, 2)}

المطلوب منك تحليل شامل يشمل:

📈 1. التحليل المالي المتقدم:
- تحليل الربحية والسيولة
- نسب الأداء المالي
- مقارنة مع معايير الصناعة في الجزائر
- تحليل التدفقات النقدية

⚠️ 2. تحليل المخاطر والفرص:
- المخاطر المالية المحتملة
- الفرص الاستثمارية
- نقاط الضعف في العمليات
- التهديدات الخارجية

💡 3. التوصيات الاستراتيجية (8-10 توصيات محددة):
- توصيات قصيرة المدى (1-3 أشهر)
- توصيات متوسطة المدى (3-12 شهر)
- توصيات طويلة المدى (سنة فأكثر)
- توصيات خاصة بالسوق الجزائري

🎯 4. مؤشرات الأداء الرئيسية (KPIs):
- المؤشرات الحالية
- المؤشرات المقترحة للمتابعة
- الأهداف الشهرية والسنوية

📊 5. خطة التحسين والنمو:
- استراتيجيات زيادة الإيرادات
- طرق تقليل التكاليف
- تحسين الكفاءة التشغيلية
- خطط التوسع والنمو

💰 6. التوصيات المالية:
- إدارة رأس المال العامل
- خيارات التمويل المتاحة في الجزائر
- سياسات الاستثمار
- التخطيط الضريبي

🔍 7. التحليل التنافسي:
- موقع المؤسسة في السوق
- نقاط القوة التنافسية
- استراتيجيات التميز
- فرص النمو

اكتب التحليل بطريقة احترافية ومنظمة، مع استخدام العناوين والنقاط الواضحة. ركز على النصائح العملية القابلة للتطبيق في البيئة التجارية الجزائرية.`;
}

function analyzeDataPatterns(data, basicAnalysis) {
  const headers = Object.keys(data[0] || {});
  const numericColumns = headers.filter(h => {
    return data.some(row => !isNaN(parseFloat(row[h])));
  });

  let variance = 'متوسط';
  let trend = 'مستقر';

  if (numericColumns.length > 0) {
    const values = data.map(row => parseFloat(row[numericColumns[0]]) || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const varianceValue = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const standardDeviation = Math.sqrt(varianceValue);

    // تحديد مستوى التباين
    if (standardDeviation / mean > 0.5) {
      variance = 'عالي';
    } else if (standardDeviation / mean > 0.2) {
      variance = 'متوسط';
    } else {
      variance = 'منخفض';
    }

    // تحديد الاتجاه العام
    if (values.length > 2) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.1) {
        trend = 'تصاعدي';
      } else if (secondAvg < firstAvg * 0.9) {
        trend = 'تنازلي';
      } else {
        trend = 'مستقر';
      }
    }
  }

  return {
    variance,
    trend,
    dataQuality: data.length > 10 ? 'جيدة' : 'محدودة',
    completeness: calculateDataCompleteness(data)
  };
}

function calculateDataCompleteness(data) {
  if (data.length === 0) return 0;
  
  const headers = Object.keys(data[0]);
  const totalCells = data.length * headers.length;
  const filledCells = data.reduce((count, row) => {
    return count + headers.reduce((cellCount, header) => {
      return cellCount + (row[header] !== undefined && row[header] !== null && row[header] !== '' ? 1 : 0);
    }, 0);
  }, 0);

  return Math.round((filledCells / totalCells) * 100);
}

function parseAIRecommendations(aiResponse) {
  const recommendations = [];
  const lines = aiResponse.split('\n');

  let currentRecommendation = null;
  const isEnglish = aiResponse.includes('RECOMMENDATIONS') || aiResponse.includes('ANALYSIS') || aiResponse.includes('STRATEGY');

  lines.forEach(line => {
    const trimmedLine = line.trim();

    // تحديد أنماط الترقيم للغتين
    const numberPattern = isEnglish ? /^\d+\./ : /^\d+\./;
    const bulletPattern = /^[-•▪▫]\s*/;

    if (trimmedLine.match(numberPattern) || trimmedLine.match(bulletPattern)) {
      if (currentRecommendation) {
        recommendations.push(currentRecommendation);
      }
      currentRecommendation = {
        title: trimmedLine.replace(numberPattern, '').replace(bulletPattern, '').trim(),
        description: '',
        category: isEnglish ? 'General' : 'عام',
        priority: isEnglish ? 'Medium' : 'متوسطة',
        language: isEnglish ? 'en' : 'ar'
      };
    } else if (currentRecommendation && trimmedLine && !trimmedLine.match(/^[📈📊💡🎯⚠️💰🔍]/)) {
      currentRecommendation.description += trimmedLine + ' ';
    }
  });

  if (currentRecommendation) {
    recommendations.push(currentRecommendation);
  }

  // تحسين تصنيف التوصيات
  return recommendations.map(rec => ({
    ...rec,
    category: detectRecommendationCategory(rec.title + ' ' + rec.description, rec.language),
    priority: detectRecommendationPriority(rec.title + ' ' + rec.description, rec.language)
  }));
}

function detectRecommendationCategory(text, language = 'ar') {
  const lowerText = text.toLowerCase();
  
  if (language === 'en') {
    if (lowerText.includes('sales') || lowerText.includes('revenue') || lowerText.includes('customer') || lowerText.includes('marketing')) {
      return 'Sales & Marketing';
    } else if (lowerText.includes('cost') || lowerText.includes('expense') || lowerText.includes('saving') || lowerText.includes('budget')) {
      return 'Cost Management';
    } else if (lowerText.includes('employee') || lowerText.includes('staff') || lowerText.includes('team') || lowerText.includes('training')) {
      return 'Human Resources';
    } else if (lowerText.includes('investment') || lowerText.includes('financing') || lowerText.includes('capital') || lowerText.includes('funding')) {
      return 'Finance & Investment';
    } else if (lowerText.includes('quality') || lowerText.includes('process') || lowerText.includes('efficiency') || lowerText.includes('operation')) {
      return 'Operations & Quality';
    } else if (lowerText.includes('growth') || lowerText.includes('expansion') || lowerText.includes('strategy') || lowerText.includes('development')) {
      return 'Growth & Development';
    }
    return 'General';
  } else {
    if (lowerText.includes('مبيعات') || lowerText.includes('إيراد') || lowerText.includes('عملاء') || lowerText.includes('تسويق')) {
      return 'المبيعات والتسويق';
    } else if (lowerText.includes('تكلفة') || lowerText.includes('مصروف') || lowerText.includes('توفير') || lowerText.includes('ميزانية')) {
      return 'إدارة التكاليف';
    } else if (lowerText.includes('موظف') || lowerText.includes('فريق') || lowerText.includes('تدريب') || lowerText.includes('عمال')) {
      return 'الموارد البشرية';
    } else if (lowerText.includes('استثمار') || lowerText.includes('تمويل') || lowerText.includes('رأس مال') || lowerText.includes('قرض')) {
      return 'التمويل والاستثمار';
    } else if (lowerText.includes('جودة') || lowerText.includes('عملية') || lowerText.includes('كفاءة') || lowerText.includes('تشغيل')) {
      return 'العمليات والجودة';
    } else if (lowerText.includes('نمو') || lowerText.includes('توسع') || lowerText.includes('استراتيجية') || lowerText.includes('تطوير')) {
      return 'النمو والتطوير';
    }
    return 'عام';
  }
}

function detectRecommendationPriority(text, language = 'ar') {
  const lowerText = text.toLowerCase();
  
  if (language === 'en') {
    if (lowerText.includes('urgent') || lowerText.includes('immediate') || lowerText.includes('critical') || lowerText.includes('important') || lowerText.includes('priority')) {
      return 'High';
    } else if (lowerText.includes('improve') || lowerText.includes('develop') || lowerText.includes('increase') || lowerText.includes('enhance')) {
      return 'Medium';
    }
    return 'Low';
  } else {
    if (lowerText.includes('عاجل') || lowerText.includes('فوري') || lowerText.includes('خطر') || lowerText.includes('مهم') || lowerText.includes('أولوية')) {
      return 'عالية';
    } else if (lowerText.includes('تحسين') || lowerText.includes('تطوير') || lowerText.includes('زيادة') || lowerText.includes('تعزيز')) {
      return 'متوسطة';
    }
    return 'منخفضة';
  }
}

async function saveAnalysisToUser(userId, analysis) {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex !== -1) {
    if (!users[userIndex].analyses) {
      users[userIndex].analyses = [];
    }

    users[userIndex].analyses.push({
      id: Date.now().toString(),
      ...analysis,
      createdAt: new Date().toISOString()
    });

    if (users[userIndex].analyses.length > 20) {
      users[userIndex].analyses = users[userIndex].analyses.slice(-20);
    }

    writeUsers(users);
  }
}

app.post('/update-user-profile', function(req, res) {
  const { userId, name, email, profile } = req.body;

  if (!userId || !name || !email) {
    return res.status(400).json({ success: false, message: 'المعرف والاسم والبريد الإلكتروني مطلوبان' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  const existingUser = users.find(u => u.email === email && u.id !== userId);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'يوجد حساب آخر بهذا البريد الإلكتروني' });
  }

  users[userIndex].name = name;
  users[userIndex].email = email;
  users[userIndex].profile = profile;
  users[userIndex].lastUpdated = new Date().toISOString();

  if (writeUsers(users)) {
    const { password: _, ...userWithoutPassword } = users[userIndex];
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حفظ التحديثات' });
  }
});

app.post('/change-password', function(req, res) {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  if (users[userIndex].password !== currentPassword) {
    return res.status(401).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
  }

  users[userIndex].password = newPassword;
  users[userIndex].passwordChangedAt = new Date().toISOString();

  if (writeUsers(users)) {
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حفظ كلمة المرور الجديدة' });
  }
});

app.post('/update-notifications', function(req, res) {
  const { userId, notifications } = req.body;

  if (!userId || !notifications) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم وإعدادات الإشعارات مطلوبان' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  users[userIndex].notifications = notifications;
  users[userIndex].notificationsUpdatedAt = new Date().toISOString();

  if (writeUsers(users)) {
    res.json({ success: true, message: 'تم حفظ إعدادات الإشعارات بنجاح' });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حفظ إعدادات الإشعارات' });
  }
});

app.delete('/delete-account', function(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  users.splice(userIndex, 1);

  if (writeUsers(users)) {
    console.log(`🗑️ تم حذف حساب المستخدم: ${userId}`);
    res.json({ success: true, message: 'تم حذف الحساب بنجاح' });
  } else {
    res.status(500).json({ success: false, message: 'فشل في حذف الحساب' });
  }
});

// دمج الخادمين في خادم واحد
app.use(express.static('.'));

// إضافة route للصفحة الرئيسية
app.get('*', function(req, res) {
  // التحقق من وجود الملف المطلوب
  const requestedPath = req.path;
  const filePath = path.join(__dirname, requestedPath === '/' ? 'index.html' : requestedPath);
  
  if (fs.existsSync(filePath) && requestedPath.endsWith('.html')) {
    res.sendFile(filePath);
  } else if (requestedPath === '/' || !requestedPath.includes('.')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).send('File not found');
  }
});

app.listen(PORT, '0.0.0.0', function() {
  console.log(`✅ خادم Rased AI يعمل على http://0.0.0.0:${PORT}`);
  console.log(`🌐 يمكن الوصول للموقع من: https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'your-username'}.repl.co`);
});
