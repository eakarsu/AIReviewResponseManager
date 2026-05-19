require('dotenv').config({ path: '../../.env' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// PII sanitization: strip emails and phone numbers from review text
const sanitizePII = (text) => {
  if (!text) return '';
  return text
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g, '[PHONE]');
};

// Sanitize for prompt injection: escape backticks and limit length
const sanitizeForPrompt = (text, maxLen = 2000) => {
  if (!text) return '';
  return sanitizePII(text)
    .replace(/`/g, "'")
    .replace(/\$/g, '\\$')
    .slice(0, maxLen);
};

// 3-strategy JSON parser
const parseAIJson = (content) => {
  // Strategy 1: try direct JSON parse
  try {
    return JSON.parse(content);
  } catch (_) {}

  // Strategy 2: extract JSON from markdown code block
  try {
    const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) return JSON.parse(codeBlock[1].trim());
  } catch (_) {}

  // Strategy 3: extract first {...} block
  try {
    const jsonBlock = content.match(/\{[\s\S]*\}/);
    if (jsonBlock) return JSON.parse(jsonBlock[0]);
  } catch (_) {}

  return null;
};

const generateResponse = async (review, tone = 'professional', template = null) => {
  const toneDescriptions = {
    professional: 'professional and courteous',
    friendly: 'warm and friendly',
    apologetic: 'sincere and apologetic',
    grateful: 'thankful and appreciative'
  };

  const toneDesc = toneDescriptions[tone] || toneDescriptions.professional;

  const safeReviewText = sanitizeForPrompt(review.review_text);
  let prompt = `You are a business owner responding to customer reviews. Generate a ${toneDesc} response to the following review.

Review Rating: ${review.rating}/5 stars
Reviewer: ${review.reviewer_name}
Review: "${safeReviewText}"

${template ? `Use this template as a guide but personalize it:\n${template}\n\n` : ''}

Guidelines:
- Keep the response concise (2-4 sentences)
- Address specific points mentioned in the review
- ${review.rating >= 4 ? 'Thank them for the positive feedback' : 'Acknowledge their concerns and offer to make things right'}
- Include a call to action (visit again, contact us, etc.)
- Be genuine and avoid generic responses

Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'OpenRouter API error');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
};

const analyzeSentiment = async (reviewText) => {
  const safeText = sanitizeForPrompt(reviewText);
  const prompt = `Analyze the sentiment of this review and respond with ONLY one word: "positive", "neutral", or "negative".

Review: "${safeText}"

Sentiment:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 10,
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'OpenRouter API error');
    }

    const sentiment = data.choices[0].message.content.trim().toLowerCase();
    return ['positive', 'neutral', 'negative'].includes(sentiment) ? sentiment : 'neutral';
  } catch (error) {
    console.error('Sentiment Analysis Error:', error);
    // Fallback based on rating if AI fails
    return 'neutral';
  }
};

const extractKeywords = async (reviewText) => {
  const safeText = sanitizeForPrompt(reviewText);
  const prompt = `Extract the main keywords/topics from this review. Return ONLY a comma-separated list of 3-5 keywords.

Review: "${safeText}"

Keywords:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'OpenRouter API error');
    }

    const keywords = data.choices[0].message.content.trim().split(',').map(k => k.trim());
    return keywords;
  } catch (error) {
    console.error('Keyword Extraction Error:', error);
    return [];
  }
};

const suggestTemplate = async (review) => {
  const prompt = `Based on this review, suggest what type of response template would be most appropriate. Return ONLY one of these categories: "positive", "negative", "neutral", "apology", "thank_you".

Review Rating: ${review.rating}/5 stars
Review: "${review.review_text}"

Category:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 20,
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'OpenRouter API error');
    }

    const category = data.choices[0].message.content.trim().toLowerCase();
    return ['positive', 'negative', 'neutral', 'apology', 'thank_you'].includes(category) ? category : 'neutral';
  } catch (error) {
    console.error('Template Suggestion Error:', error);
    return review.rating >= 4 ? 'positive' : 'negative';
  }
};

// ==================== NEW AI FEATURES ====================

const detectFakeReview = async (reviewText, reviewerName = '', platform = '') => {
  const safeText = sanitizeForPrompt(reviewText);
  const prompt = `You are an expert fraud analyst specializing in fake review detection. Perform a thorough, detailed analysis of this review to determine if it is fake, spam, or fraudulent.

Review: "${safeText}"
Reviewer: ${reviewerName || 'Unknown'}
Platform: ${platform || 'Unknown'}

Analyze EACH of the following factors in detail and explain your reasoning for each:
1. Language authenticity — Is the language natural or templated? Are there cliches, excessive superlatives, or marketing-like phrases?
2. Specificity — Does the review mention specific product details, features, experiences, or is it vague and generic?
3. Emotional patterns — Is the sentiment proportional and justified, or extreme without substance?
4. Writing style — Does it read like a genuine customer or a paid reviewer/bot? Check grammar patterns, sentence structure variety.
5. Reviewer credibility — Based on the reviewer name and platform, are there any suspicious indicators?
6. Detail consistency — Are the claims internally consistent? Do details contradict each other?

Respond in the following JSON format. Be THOROUGH — write 4-6 sentences for the analysis, list ALL red flags found (or explain why there are none), and give a detailed recommendation:
{
  "fake_probability": <number 0-100>,
  "confidence_score": <number 0-100>,
  "red_flags": ["Detailed description of red flag 1", "Detailed description of red flag 2", ...],
  "analysis": "A comprehensive 4-6 sentence analysis covering language patterns, specificity level, emotional authenticity, writing style assessment, and overall verdict with clear reasoning.",
  "recommendation": "A detailed 2-3 sentence recommendation on what action to take, including specific next steps for the business owner."
}

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const parsed = parseAIJson(content);
    return parsed || { fake_probability: 50, confidence_score: 50, red_flags: [], analysis: content };
  } catch (error) {
    console.error('Fake Review Detection Error:', error);
    throw error;
  }
};

const summarizeReviews = async (productName, reviews) => {
  const reviewsText = reviews.map((r, i) => `Review ${i + 1} (${r.rating}/5): "${r.text}"`).join('\n');

  const prompt = `You are an expert product analyst. Thoroughly analyze these ${reviews.length} customer reviews for "${productName}" and provide a comprehensive summary with actionable insights.

Reviews:
${reviewsText}

Provide a detailed analysis in the following JSON format. Be thorough and specific — reference actual review content, identify patterns, and give actionable recommendations:
{
  "summary": "A detailed 3-4 sentence summary covering overall customer sentiment, product strengths, weaknesses, and who this product is best suited for.",
  "pros": ["Specific strength 1 with detail", "Specific strength 2 with detail", "Specific strength 3 with detail", "Specific strength 4 with detail"],
  "cons": ["Specific weakness 1 with detail", "Specific weakness 2 with detail", "Specific weakness 3 with detail"],
  "common_themes": ["Recurring theme 1", "Recurring theme 2", "Recurring theme 3", "Recurring theme 4", "Recurring theme 5"],
  "sentiment_breakdown": {"positive": <percent>, "neutral": <percent>, "negative": <percent>},
  "insights": "2-3 sentences of actionable business insights: what the company should improve, what they're doing well, and strategic recommendations based on the review patterns."
}

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.5
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: content, pros: [], cons: [], common_themes: [] };
  } catch (error) {
    console.error('Review Summarization Error:', error);
    throw error;
  }
};

const analyzeTrends = async (businessName, reviewData, dateRange) => {
  const prompt = `You are a senior business intelligence analyst. Perform a comprehensive review trend analysis for "${businessName}" over the period ${dateRange.start} to ${dateRange.end}.

Review data summary:
${JSON.stringify(reviewData, null, 2)}

Analyze the data thoroughly and provide detailed insights. Be specific — reference actual data points, identify root causes behind trends, and give actionable strategic recommendations.

Respond in the following JSON format with DETAILED content for each field:
{
  "trend_direction": "improving" | "declining" | "stable",
  "sentiment_change": <percentage change, positive or negative>,
  "emerging_topics": ["Detailed emerging topic 1 with context", "Detailed emerging topic 2 with context", "Detailed emerging topic 3 with context"],
  "declining_topics": ["Detailed declining topic 1 with context", "Detailed declining topic 2 with context"],
  "seasonal_patterns": {"pattern": "A detailed 2-3 sentence description of seasonal patterns observed, including specific time periods and their characteristics", "peak_periods": ["Period 1 with explanation"], "low_periods": ["Period 1 with explanation"]},
  "prediction": "A detailed 3-4 sentence forecast for the upcoming period, including expected sentiment shifts, emerging concerns, and growth opportunities based on current trajectory.",
  "recommendations": ["Detailed actionable recommendation 1 with specific steps", "Detailed actionable recommendation 2 with specific steps", "Detailed actionable recommendation 3 with specific steps", "Detailed actionable recommendation 4 with specific steps"]
}

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.4
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { trend_direction: 'stable', prediction: content };
  } catch (error) {
    console.error('Trend Analysis Error:', error);
    throw error;
  }
};

const detectCounterfeit = async (productName, reviews, sellerInfo = '') => {
  const reviewsText = reviews.map((r, i) => `Review ${i + 1}: "${r}"`).join('\n');

  const prompt = `You are a product authenticity expert. Perform a thorough counterfeit risk analysis for "${productName}" based on customer reviews.

Seller: ${sellerInfo || 'Unknown'}
Reviews:
${reviewsText}

Examine each review carefully for indicators of counterfeit products. Consider quality complaints, packaging issues, comparison to authentic products, seller behavior, and pricing anomalies. Be thorough and specific in your analysis.

Respond in the following JSON format with DETAILED content:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_score": <number 0-100>,
  "warning_signs": ["Detailed warning sign 1 with evidence from reviews", "Detailed warning sign 2 with evidence", "Detailed warning sign 3 with evidence"],
  "suspicious_reviews": ["Relevant quote from review 1 explaining why it's suspicious", "Relevant quote from review 2"],
  "analysis": "A comprehensive 4-6 sentence counterfeit risk analysis covering quality consistency patterns, packaging authenticity indicators, customer comparison to genuine products, pricing analysis, and seller credibility assessment.",
  "recommended_action": "A detailed 2-3 sentence action plan with specific steps the business should take, including investigation priorities, customer communication strategy, and preventive measures."
}

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { risk_level: 'low', risk_score: 0, analysis: content };
  } catch (error) {
    console.error('Counterfeit Detection Error:', error);
    throw error;
  }
};

const analyzeCompetitor = async (competitorName, competitorReviews, ownBusinessData = null) => {
  const reviewsText = competitorReviews.map((r, i) => `Review ${i + 1} (${r.rating}/5): "${r.text}"`).join('\n');

  const prompt = `You are a competitive intelligence strategist. Perform a comprehensive competitive analysis for "${competitorName}" based on their customer reviews.

Competitor Reviews:
${reviewsText}

${ownBusinessData ? `Your Business Data for comparison:\n${JSON.stringify(ownBusinessData, null, 2)}` : ''}

Analyze the competitor's market position, customer satisfaction drivers, and vulnerabilities. Be specific — reference actual review content, identify patterns, and provide strategic insights.

Respond in the following JSON format with DETAILED, actionable content:
{
  "sentiment_score": <number 0-100>,
  "strengths": ["Detailed competitor strength 1 with evidence from reviews", "Detailed strength 2 with evidence", "Detailed strength 3 with evidence", "Detailed strength 4"],
  "weaknesses": ["Detailed competitor weakness 1 with evidence from reviews", "Detailed weakness 2 with evidence", "Detailed weakness 3 with evidence"],
  "key_differentiators": ["What makes this competitor unique - point 1 with detail", "Differentiator 2 with detail", "Differentiator 3 with detail"],
  "competitive_analysis": "A thorough 4-6 sentence analysis of the competitor's market positioning, customer satisfaction drivers, brand perception, service quality patterns, and how they compare to industry standards.",
  "opportunities": ["Specific exploitable opportunity 1 based on competitor gaps", "Opportunity 2 with strategic approach", "Opportunity 3 with implementation idea"],
  "threats": ["Specific competitive threat 1 with assessment", "Threat 2 with risk level", "Threat 3 with mitigation suggestion"]
}

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.5
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { sentiment_score: 50, competitive_analysis: content };
  } catch (error) {
    console.error('Competitor Analysis Error:', error);
    throw error;
  }
};

const personalizeResponse = async (review, reviewerProfile) => {
  const prompt = `You are an expert customer relationship manager. Generate a highly personalized, thoughtful response to this review, carefully tailored to the reviewer's profile and history.

Original Review: "${review.text}"
Rating: ${review.rating}/5
Sentiment: ${review.sentiment || 'neutral'}

Reviewer Profile:
${JSON.stringify(reviewerProfile, null, 2)}

Craft a response that feels genuinely personal — not templated. Reference specific details from their review, acknowledge their unique perspective, and make them feel valued as an individual customer.

Respond in the following JSON format with DETAILED, thoughtful content:
{
  "personalization_factors": ["Detailed factor 1 explaining how it influenced the response", "Detailed factor 2 with reasoning", "Detailed factor 3 with reasoning", "Detailed factor 4"],
  "generated_response": "A warm, detailed 4-6 sentence personalized response that directly addresses specific points from the review, references the reviewer's profile/history, includes a genuine personal touch, and ends with a meaningful call to action.",
  "tone": "professional" | "friendly" | "apologetic" | "grateful",
  "personalization_score": <number 0-100>,
  "reasoning": "A detailed 3-4 sentence explanation of why this specific tone and approach was chosen, what personalization elements were prioritized, and how the response strategy aligns with the reviewer's profile and sentiment."
}

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.6
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { generated_response: content, personalization_score: 70 };
  } catch (error) {
    console.error('Response Personalization Error:', error);
    throw error;
  }
};

const generateSolicitation = async (customer) => {
  const prompt = `You are a customer engagement specialist. Generate a compelling, personalized review solicitation strategy and message for this customer.

Customer Information:
${JSON.stringify(customer, null, 2)}

Create a solicitation approach that feels natural and respectful — not pushy. The message should make the customer feel their opinion is genuinely valued and make it easy for them to leave a review.

Respond in the following JSON format with DETAILED, thoughtful content:
{
  "optimal_timing": "A specific time recommendation (e.g., 'Tuesday at 10:00 AM, 5 days after purchase') with a detailed explanation of why this timing maximizes response rates for this customer type.",
  "recommended_channel": "email" | "sms" | "in_app",
  "message_template": "A professional 3-4 sentence generic template that can be reused, with placeholder markers like [Customer Name] and [Product Name].",
  "personalized_message": "A warm, detailed 4-6 sentence personalized review request that references the customer's specific purchase, acknowledges their experience, explains why their feedback matters, and includes a clear easy call to action with a direct review link.",
  "timing_reason": "A detailed 2-3 sentence explanation of the timing strategy, including psychological factors, customer behavior patterns, and industry best practices that support this choice.",
  "expected_response_rate": <percentage>
}

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.6
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { personalized_message: content, recommended_channel: 'email' };
  } catch (error) {
    console.error('Solicitation Generation Error:', error);
    throw error;
  }
};

// Reputation score AI narrative
const generateReputationNarrative = async (businessName, scoreData) => {
  const prompt = `You are a business reputation analyst. Generate a concise 2-3 sentence narrative about the reputation score for "${businessName}".

Score Data:
${JSON.stringify(scoreData, null, 2)}

Respond with ONLY a JSON object:
{
  "narrative": "2-3 sentence assessment of the business reputation",
  "key_strengths": ["strength 1", "strength 2"],
  "key_concerns": ["concern 1", "concern 2"],
  "priority_action": "single most impactful action to improve score"
}

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.5
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const content = data.choices[0].message.content.trim();
    return parseAIJson(content) || { narrative: content };
  } catch (error) {
    console.error('Reputation Narrative Error:', error);
    return { narrative: 'Unable to generate narrative at this time.' };
  }
};

// Auto-respond using AI
const generateAutoResponse = async (review, config) => {
  const safeText = sanitizeForPrompt(review.review_text);
  const prompt = `You are a business owner on autopilot responding to customer reviews. Generate a ${config.tone || 'professional'} response.

Review Rating: ${review.rating}/5 stars
Review: "${safeText}"
Business: ${config.business_name || 'Our Business'}
Signature: ${config.signature || '- The Team'}

Rules: Keep under 150 words. Be genuine. ${review.rating <= 2 ? 'Acknowledge the issue and invite offline contact.' : 'Thank them and encourage a return visit.'}

Response (text only, no JSON):`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Auto-Response Generation Error:', error);
    throw error;
  }
};

// Semantic search ranking
const semanticSearchReviews = async (query, reviews) => {
  const prompt = `You are a semantic search engine. Rank these reviews by relevance to the query and return results.

Query: "${sanitizeForPrompt(query, 500)}"

Reviews to rank (JSON):
${JSON.stringify(reviews.map(r => ({ id: r.id, text: sanitizeForPrompt(r.review_text, 300), rating: r.rating, reviewer: r.reviewer_name })))}

Return ONLY a JSON array of objects ranked from most to least relevant:
[
  { "id": <review_id>, "relevance_score": <0-100>, "match_reason": "brief reason why this matches" },
  ...
]

JSON Response:`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Review Response Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.2
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const content = data.choices[0].message.content.trim();
    // Try to parse array
    try {
      const arr = content.match(/\[[\s\S]*\]/);
      if (arr) return JSON.parse(arr[0]);
    } catch (_) {}
    return [];
  } catch (error) {
    console.error('Semantic Search Error:', error);
    throw error;
  }
};

module.exports = {
  generateResponse,
  analyzeSentiment,
  extractKeywords,
  suggestTemplate,
  // New AI features
  detectFakeReview,
  summarizeReviews,
  analyzeTrends,
  detectCounterfeit,
  analyzeCompetitor,
  personalizeResponse,
  generateSolicitation,
  // Additional production features
  generateReputationNarrative,
  generateAutoResponse,
  semanticSearchReviews,
  sanitizePII,
  sanitizeForPrompt,
  parseAIJson,
  // Audit-driven additions
  scoreResponseQuality,
  reputationRiskAlert,
  translateResponse,
  // Apply pass 4 mechanical
  suggestTeamAssignment,
  retentionTargetsFromReviews
};

// ===== Score response quality =====
async function scoreResponseQuality(review, response, brandVoice) {
  const prompt = `You are a customer-experience reviewer. Score the quality of a response to a customer review.

Original review: "${sanitizeForPrompt(review.review_text || review, 800)}" rating=${review.rating || 'unknown'}
Response: "${sanitizeForPrompt(response, 800)}"
Brand voice notes: ${sanitizeForPrompt(brandVoice || 'professional, empathetic', 400)}

Return ONLY JSON:
{
  "overall_score": 0-100,
  "dimensions": {
    "addresses_specific_concerns": 0-100,
    "empathy": 0-100,
    "ownership_and_solution": 0-100,
    "brand_voice_match": 0-100,
    "concise_and_clear": 0-100,
    "tone_appropriate_for_rating": 0-100
  },
  "strengths": [],
  "issues": [],
  "rewrite_suggestion": "",
  "summary": ""
}`;
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'AI Review Response Manager' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 1200, temperature: 0.3 })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return parseAIJson(data.choices[0].message.content) || { raw: data.choices[0].message.content };
}

// ===== Reputation risk alert =====
async function reputationRiskAlert(businessName, recentReviews, baseline) {
  const sample = (recentReviews || []).slice(0, 30).map(r => ({ rating: r.rating, text: sanitizeForPrompt(r.review_text, 400), createdAt: r.created_at || r.createdAt }));
  const prompt = `You are a reputation-risk analyst. Flag whether the business is heading toward a reputation crisis.

Business: ${sanitizeForPrompt(businessName, 200)}
Baseline (e.g. avg rating, reply rate): ${JSON.stringify(baseline || {})}
Recent reviews: ${JSON.stringify(sample)}

Return ONLY JSON:
{
  "risk_level": "none|low|moderate|high|critical",
  "trend": "improving|stable|worsening",
  "drivers": [{"theme": "", "evidence_review_indices": [], "severity": "low|medium|high"}],
  "predicted_impact_if_unaddressed": "",
  "recommended_actions": [{"action": "", "owner": "marketing|ops|leadership|product", "urgency": "immediate|24h|this_week"}],
  "talking_points_for_response_team": [],
  "summary": ""
}`;
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'AI Review Response Manager' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 1500, temperature: 0.3 })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return parseAIJson(data.choices[0].message.content) || { raw: data.choices[0].message.content };
}

// ===== Team assignment suggester (Apply pass 4) =====
async function suggestTeamAssignment(review, teamMembers, workloadHints) {
  const sample = (teamMembers || []).slice(0, 25).map(m => ({
    id: m.id, name: m.name, role: m.role, languages: m.languages,
    expertise: m.expertise, current_open: m.current_open
  }));
  const prompt = `You are an operations lead routing review responses to team members. Pick the best owner for the review.

Review: rating=${review.rating || 'unknown'} platform=${review.platform || 'unknown'} text="${sanitizeForPrompt(review.review_text || review.text || '', 800)}"
Workload hints: ${sanitizeForPrompt(workloadHints || 'balance load', 400)}
Team:
${JSON.stringify(sample, null, 2)}

Return ONLY JSON: { "suggested_owner_id": any, "reasoning": "", "alternates": [{"id": any, "reason": ""}], "sla_minutes": number, "tags": [] }.`;
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'AI Review Response Manager' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0.3 })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return parseAIJson(data.choices[0].message.content) || { raw: data.choices[0].message.content };
}

// ===== Retention targeting from negative reviews (Apply pass 4) =====
async function retentionTargetsFromReviews(businessName, recentReviews, retentionPlaybook) {
  const negative = (recentReviews || [])
    .filter(r => Number(r.rating) <= 3)
    .slice(0, 30)
    .map(r => ({ id: r.id, rating: r.rating, text: sanitizeForPrompt(r.review_text || '', 500), createdAt: r.created_at }));
  const prompt = `You are a customer retention strategist. From the recent negative reviews, identify the highest-value customers to target with retention outreach and a tactical plan.

Business: ${sanitizeForPrompt(businessName || 'Unknown', 200)}
Playbook hints: ${sanitizeForPrompt(retentionPlaybook || 'standard apology + comp + follow-up', 400)}
Negative reviews (${negative.length}):
${JSON.stringify(negative, null, 2)}

Return ONLY JSON: { "targets": [{ "review_id": any, "priority": "high|medium|low", "outreach_channel": "", "offer": "", "talking_points": [], "expected_save_rate_pct": number }], "themes": [], "global_actions": [], "summary": "" }.`;
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'AI Review Response Manager' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 1500, temperature: 0.3 })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return parseAIJson(data.choices[0].message.content) || { raw: data.choices[0].message.content };
}

// ===== Multi-language response translation =====
async function translateResponse(originalResponse, targetLanguage, preserveTone = true) {
  const prompt = `Translate the following review-response into ${targetLanguage}. ${preserveTone ? 'Preserve the brand voice, tone and any specific commitments verbatim where possible.' : ''} Return ONLY JSON: { "translated": "", "language": "${targetLanguage}", "back_translation_for_qa": "", "notes": "" }.

Source response:
"""
${sanitizeForPrompt(originalResponse, 1500)}
"""`;
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'AI Review Response Manager' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 1200, temperature: 0.2 })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return parseAIJson(data.choices[0].message.content) || { raw: data.choices[0].message.content };
}
