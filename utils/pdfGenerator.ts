import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';

type TriggerData = {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  aqi?: number;
  category?: string;
  pm25?: number;
  pm10?: number;
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
};

type ReportData = {
  userName: string;
  userEmail: string;
  triggers: TriggerData[];
  totalTriggers: number;
  avgAqi: number;
  dateRange: string;
};

const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return '#10B981';
  if (aqi <= 100) return '#F59E0B';
  if (aqi <= 150) return '#F97316';
  if (aqi <= 200) return '#EF4444';
  if (aqi <= 300) return '#9333EA';
  return '#7C2D12';
};

const getAQICategory = (aqi: number): string => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

const analyzeRiskyLocations = (triggers: TriggerData[]) => {
  const riskyLocations: { [key: string]: { count: number; avgAqi: number; lat: number; lon: number } } = {};
  
  triggers.forEach(trigger => {
    if (trigger.aqi && trigger.aqi > 100) {
      const lat = Math.round(trigger.latitude * 100) / 100;
      const lon = Math.round(trigger.longitude * 100) / 100;
      const key = `${lat},${lon}`;
      
      if (!riskyLocations[key]) {
        riskyLocations[key] = { count: 0, avgAqi: 0, lat, lon };
      }
      riskyLocations[key].count++;
      riskyLocations[key].avgAqi += trigger.aqi;
    }
  });
  
  return Object.entries(riskyLocations)
    .map(([location, data]) => ({
      location,
      count: data.count,
      avgAqi: Math.round(data.avgAqi / data.count),
      lat: data.lat,
      lon: data.lon,
    }))
    .sort((a, b) => b.count - a.count);
};

const analyzeWeeklyData = (triggers: TriggerData[]) => {
  const weeklyData: { [key: string]: number } = {};
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });
  
  last30Days.forEach(date => {
    weeklyData[date] = 0;
  });
  
  triggers.forEach(trigger => {
    const date = new Date(trigger.timestamp).toISOString().split('T')[0];
    if (weeklyData.hasOwnProperty(date)) {
      weeklyData[date]++;
    }
  });
  
  return weeklyData;
};

const analyzeAQIDistribution = (triggers: TriggerData[]) => {
  const distribution = {
    good: 0,
    moderate: 0,
    unhealthySensitive: 0,
    unhealthy: 0,
    veryUnhealthy: 0,
    hazardous: 0,
  };
  
  triggers.forEach(trigger => {
    if (trigger.aqi) {
      if (trigger.aqi <= 50) distribution.good++;
      else if (trigger.aqi <= 100) distribution.moderate++;
      else if (trigger.aqi <= 150) distribution.unhealthySensitive++;
      else if (trigger.aqi <= 200) distribution.unhealthy++;
      else if (trigger.aqi <= 300) distribution.veryUnhealthy++;
      else distribution.hazardous++;
    }
  });
  
  return distribution;
};

const buildTriggerTableRows = (triggers: TriggerData[]) => {
  return triggers
    .map((trigger, index) => {
      const date = new Date(trigger.timestamp);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            ${date.toLocaleDateString()}<br />
            <span>${date.toLocaleTimeString()}</span>
          </td>
          <td>
            <span style="color: ${getAQIColor(trigger.aqi || 0)}; font-weight: 600;">
              ${trigger.aqi ?? 'N/A'}
            </span>
            <div>${getAQICategory(trigger.aqi || 0)}</div>
          </td>
          <td>${trigger.temperature?.toFixed(1) ?? 'N/A'}°C</td>
          <td>${trigger.humidity?.toFixed(0) ?? 'N/A'}%</td>
          <td>
            PM2.5: ${trigger.pm25?.toFixed(1) ?? 'N/A'}<br />
            PM10: ${trigger.pm10?.toFixed(1) ?? 'N/A'}
          </td>
        </tr>
      `;
    })
    .join('');
};

const generateTriggerTableSection = (triggers: TriggerData[]) => {
  if (!triggers || triggers.length === 0) return '';

  return `
    <div class="section">
      <h2 class="section-title">📋 Detailed Trigger Log</h2>
      <div class="table-wrapper">
        <table class="trigger-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date & Time</th>
              <th>AQI</th>
              <th>Temperature</th>
              <th>Humidity</th>
              <th>Pollutants</th>
            </tr>
          </thead>
          <tbody>
            ${buildTriggerTableRows(triggers)}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const getReportGroqApiKeys = (): string[] => {
  const keys = [
    process.env.EXPO_PUBLIC_REPORT_GROQ_KEY_1,
    process.env.EXPO_PUBLIC_REPORT_GROQ_KEY_2,
  ].filter((key): key is string => Boolean(key));

  return [...new Set(keys)];
};

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REPORT_GROQ_MODEL = 'llama-3.1-8b-instant';

const generateAIInsights = async (reportData: ReportData): Promise<string> => {
  const riskyLocations = analyzeRiskyLocations(reportData.triggers);
  const aqiDistribution = analyzeAQIDistribution(reportData.triggers);
  const prompt = `You are a health advisor analyzing asthma trigger data. Generate a comprehensive health report based on the following data:

Total Triggers: ${reportData.totalTriggers}
Average AQI: ${reportData.avgAqi}
Date Range: ${reportData.dateRange}

AQI Distribution:
- Good (0-50): ${aqiDistribution.good} times
- Moderate (51-100): ${aqiDistribution.moderate} times
- Unhealthy for Sensitive (101-150): ${aqiDistribution.unhealthySensitive} times
- Unhealthy (151-200): ${aqiDistribution.unhealthy} times
- Very Unhealthy (201-300): ${aqiDistribution.veryUnhealthy} times
- Hazardous (300+): ${aqiDistribution.hazardous} times

Risky Locations (AQI > 100): ${riskyLocations.length} locations

Generate a professional medical report with these sections:
1. Overall Health Assessment (2-3 sentences)
2. Key Findings (3-4 bullet points)
3. Risk Analysis (2-3 sentences about exposure patterns)
4. Recommendations (4-5 specific actionable recommendations)

Keep it professional, concise, and focused on actionable health advice for asthma patients.`;

  const apiKeys = getReportGroqApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('REPORT_GROQ_KEYS_NOT_CONFIGURED');
  }

  let lastError: any = null;

  for (const apiKey of apiKeys) {
    try {
      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: REPORT_GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a health advisor creating concise, professional asthma report insights.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.6,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const bodyText = await response.text().catch(() => '');
        lastError = new Error(`Groq response ${status} ${bodyText}`);

        // Try next key for auth/rate/temporary failures.
        if (status === 401 || status === 403 || status === 429 || status >= 500) {
          continue;
        }

        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content && String(content).trim().length > 0) {
        return String(content).trim();
      }

      lastError = new Error('Groq empty response');
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  console.error('Report AI insights failed for all keys:', lastError);
  throw new Error('REPORT_AI_TEMPORARY_UNAVAILABLE');
};

const generateBarChart = (data: { [key: string]: number }) => {
  const entries = Object.entries(data);
  const maxValue = Math.max(...entries.map(([_, value]) => value), 1);
  const scaleFactor = 200 / maxValue;
  
  return entries.map(([date, value], index) => {
    const height = value * scaleFactor;
    const label = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `
      <div style="display: inline-block; width: ${100 / entries.length}%; text-align: center; vertical-align: bottom;">
        <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6); height: ${height}px; width: 70%; margin: 0 auto; border-radius: 4px 4px 0 0; position: relative;">
          ${value > 0 ? `<span style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: bold; color: #6366F1;">${value}</span>` : ''}
        </div>
        <div style="font-size: 8px; margin-top: 5px; transform: rotate(-45deg); white-space: nowrap;">${label}</div>
      </div>
    `;
  }).join('');
};

const generatePieChart = (distribution: any) => {
  const total = Object.values(distribution).reduce((sum: number, val: any) => sum + val, 0);
  if (total === 0) return '<p style="text-align: center; color: #9CA3AF;">No data available</p>';
  
  const colors = ['#10B981', '#F59E0B', '#F97316', '#EF4444', '#9333EA', '#7C2D12'];
  const labels = ['Good', 'Moderate', 'Unhealthy (Sensitive)', 'Unhealthy', 'Very Unhealthy', 'Hazardous'];
  const values = Object.values(distribution);
  
  let angle = 0;
  const segments = values.map((value: any, index) => {
    const percent = (value / total) * 100;
    const segmentAngle = (value / total) * 360;
    const startAngle = angle;
    angle += segmentAngle;
    
    return { percent, color: colors[index], label: labels[index], value };
  });
  
  return `
    <div style="display: flex; align-items: center; gap: 30px;">
      <div style="position: relative; width: 150px; height: 150px;">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r="60" fill="none" stroke="#E5E7EB" stroke-width="30"/>
          ${segments.map((seg, i) => {
            const previousAngle = segments.slice(0, i).reduce((sum, s) => sum + (s.percent / 100) * 360, 0);
            const startAngle = previousAngle - 90;
            const endAngle = startAngle + (seg.percent / 100) * 360;
            
            const startX = 75 + 60 * Math.cos((startAngle * Math.PI) / 180);
            const startY = 75 + 60 * Math.sin((startAngle * Math.PI) / 180);
            const endX = 75 + 60 * Math.cos((endAngle * Math.PI) / 180);
            const endY = 75 + 60 * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArc = seg.percent > 50 ? 1 : 0;
            
            return seg.value > 0 ? `
              <path d="M 75 75 L ${startX} ${startY} A 60 60 0 ${largeArc} 1 ${endX} ${endY} Z" 
                    fill="${seg.color}" stroke="white" stroke-width="2"/>
            ` : '';
          }).join('')}
        </svg>
      </div>
      <div style="flex: 1;">
        ${segments.map(seg => seg.value > 0 ? `
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <div style="width: 16px; height: 16px; background: ${seg.color}; border-radius: 3px; margin-right: 8px;"></div>
            <span style="font-size: 12px; color: #4B5563;">${seg.label}: <strong>${seg.value}</strong> (${seg.percent.toFixed(1)}%)</span>
          </div>
        ` : '').join('')}
      </div>
    </div>
  `;
};

export const generateHealthReport = async (reportData: ReportData) => {
  try {
    const riskyLocations = analyzeRiskyLocations(reportData.triggers);
    const weeklyData = analyzeWeeklyData(reportData.triggers);
    const aqiDistribution = analyzeAQIDistribution(reportData.triggers);
    
    // Generate AI insights with report-only Groq fallback keys.
    let aiInsights = '';
    try {
      aiInsights = await generateAIInsights(reportData);
    } catch (error: any) {
      if (error?.message === 'REPORT_GROQ_KEYS_NOT_CONFIGURED') {
        Alert.alert('AI setup needed', 'Report AI keys are missing. Please configure EXPO_PUBLIC_REPORT_GROQ_KEY_1 and EXPO_PUBLIC_REPORT_GROQ_KEY_2.');
      } else {
        Alert.alert('Please wait', 'AI report is busy right now. Please come again after 2 minutes.');
      }
      aiInsights = 'AI analysis is temporarily unavailable. Please try generating the report again after 2 minutes.';
    }
    
    // Use QAir branding without external logo
    const logoBase64 = '';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          color: #1F2937;
          line-height: 1.6;
          padding: 40px;
        }
        .header {
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .logo {
          width: 60px;
          height: 60px;
          background: white;
          border-radius: 12px;
          padding: 8px;
        }
        .app-name {
          font-size: 32px;
          font-weight: bold;
        }
        .report-title {
          font-size: 18px;
          opacity: 0.9;
          margin-top: 5px;
        }
        .user-info {
          background: #F3F4F6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .user-info h2 {
          color: #6366F1;
          margin-bottom: 10px;
          font-size: 20px;
        }
        .user-detail {
          display: flex;
          margin: 8px 0;
          font-size: 14px;
        }
        .user-detail strong {
          width: 120px;
          color: #4B5563;
        }
        .section {
          margin-bottom: 35px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 22px;
          color: #6366F1;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 3px solid #6366F1;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: linear-gradient(135deg, #EEF2FF, #E0E7FF);
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }
        .stat-value {
          font-size: 36px;
          font-weight: bold;
          color: #6366F1;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .chart-container {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
        }
        .chart-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #4B5563;
        }
        .bar-chart {
          height: 250px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          border-bottom: 2px solid #E5E7EB;
          border-left: 2px solid #E5E7EB;
          padding: 20px 10px 30px 10px;
        }
        .location-list {
          background: #FEF3C7;
          border-left: 4px solid #F59E0B;
          padding: 15px;
          border-radius: 8px;
        }
        .location-item {
          padding: 12px;
          background: white;
          margin: 10px 0;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .location-coords {
          font-weight: bold;
          color: #1F2937;
        }
        .location-stats {
          display: flex;
          gap: 20px;
          font-size: 13px;
        }
        .aqi-badge {
          padding: 4px 12px;
          border-radius: 20px;
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        .ai-insights {
          background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
          border: 2px solid #10B981;
          border-radius: 10px;
          padding: 25px;
          margin: 20px 0;
        }
        .ai-insights h3 {
          color: #059669;
          margin-bottom: 15px;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ai-content {
          color: #1F2937;
          white-space: pre-line;
          line-height: 1.8;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #E5E7EB;
          text-align: center;
          color: #9CA3AF;
          font-size: 12px;
        }
        .recommendations {
          background: #FEF3C7;
          border-radius: 8px;
          padding: 20px;
          margin-top: 15px;
        }
        .recommendations ul {
          list-style: none;
          padding-left: 0;
        }
        .recommendations li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
        }
        .recommendations li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #10B981;
          font-weight: bold;
          font-size: 18px;
        }
        .table-wrapper {
          overflow-x: auto;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .trigger-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .trigger-table th {
          text-align: left;
          padding: 12px;
          background: #EEF2FF;
          color: #4B5563;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        .trigger-table td {
          padding: 12px;
          border-top: 1px solid #E5E7EB;
          vertical-align: top;
        }
        .trigger-table tbody tr:nth-child(even) {
          background: #F9FAFB;
        }
        .trigger-table td span {
          color: #6B7280;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="logo-section">
          ${logoBase64 
            ? `<img src="data:image/png;base64,${logoBase64}" class="logo" alt="QAir Logo" />` 
            : `<div class="logo" style="display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #6366F1; background: white;">🫁</div>`
          }
          <div>
            <div class="app-name">QAir</div>
            <div class="report-title">Asthma Health Report</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; opacity: 0.9;">Generated on</div>
          <div style="font-size: 18px; font-weight: bold;">${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</div>
        </div>
      </div>

      <!-- User Information -->
      <div class="user-info">
        <h2>Patient Information</h2>
        <div class="user-detail">
          <strong>Name:</strong>
          <span>${reportData.userName}</span>
        </div>
        <div class="user-detail">
          <strong>Email:</strong>
          <span>${reportData.userEmail}</span>
        </div>
        <div class="user-detail">
          <strong>Report Period:</strong>
          <span>${reportData.dateRange}</span>
        </div>
      </div>

      <!-- Key Statistics -->
      <div class="section">
        <h2 class="section-title">📊 Key Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${reportData.totalTriggers}</div>
            <div class="stat-label">Total Triggers</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${reportData.avgAqi}</div>
            <div class="stat-label">Average AQI</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${riskyLocations.length}</div>
            <div class="stat-label">Risky Locations</div>
          </div>
        </div>
      </div>

      <!-- Weekly Trigger Trend -->
      <div class="section">
        <h2 class="section-title">📈 30-Day Trigger Trend</h2>
        <div class="chart-container">
          <div class="chart-title">Daily Trigger Count (Last 30 Days)</div>
          <div class="bar-chart">
            ${generateBarChart(weeklyData)}
          </div>
        </div>
      </div>

      <!-- AQI Distribution -->
      <div class="section">
        <h2 class="section-title">🎯 Air Quality Exposure Distribution</h2>
        <div class="chart-container">
          <div class="chart-title">AQI Categories</div>
          ${generatePieChart(aqiDistribution)}
        </div>
      </div>

      <!-- Risky Locations -->
      ${riskyLocations.length > 0 ? `
      <div class="section">
        <h2 class="section-title">⚠️ Risky Locations (AQI > 100)</h2>
        <div class="location-list">
          <p style="margin-bottom: 15px; color: #92400E; font-weight: 600;">
            You visited ${riskyLocations.length} location(s) with unhealthy air quality:
          </p>
          ${riskyLocations.slice(0, 10).map(loc => `
            <div class="location-item">
              <div>
                <div class="location-coords">📍 ${loc.location}</div>
                <div class="location-stats">
                  <span>Visits: ${loc.count}</span>
                </div>
              </div>
              <div class="aqi-badge" style="background: ${getAQIColor(loc.avgAqi)}">
                AQI ${loc.avgAqi}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- AI Health Insights -->
      <div class="section">
        <h2 class="section-title">🤖 AI Health Analysis</h2>
        <div class="ai-insights">
          <h3>
            <span>💡</span>
            Personalized Insights & Recommendations
          </h3>
          <div class="ai-content">${aiInsights}</div>
        </div>
      </div>

      ${generateTriggerTableSection(reportData.triggers)}

      <!-- Footer -->
      <div class="footer">
        <p><strong>QAir - Smart Asthma Monitoring</strong></p>
        <p>This report is generated based on your recorded trigger data.</p>
        <p>For medical advice, please consult your healthcare provider.</p>
        <p style="margin-top: 10px;">© 2025 QAir App. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;

    // Create deterministic filename: yyyy-mm-dd-username.pdf
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const sanitizedUsername = (reportData.userName || 'user').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const customFilename = `${year}-${month}-${day}+${sanitizedUsername}.pdf`;
    
    // Generate PDF with custom filename
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false,
    });

    const targetDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!targetDir) {
      throw new Error('No writable directory available for PDF export.');
    }

    const namedUri = `${targetDir}${customFilename}`;
    const existing = await FileSystem.getInfoAsync(namedUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(namedUri, { idempotent: true });
    }

    await FileSystem.moveAsync({ from: uri, to: namedUri });
    
    console.log('PDF generated at:', namedUri);
    
    // Share the PDF
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(namedUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Your Health Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Success', `PDF saved to: ${namedUri}`);
    }
    
    return namedUri;
  } catch (error: any) {
    console.error('PDF generation error:', error);
    
    // Provide more specific error messages
    if (error?.message?.includes('rejected') || error?.message?.includes('writing')) {
      // This is likely an Expo Go limitation
      Alert.alert(
        'PDF Generation Not Available',
        'PDF generation requires a development build. In Expo Go, this feature has limited support.\n\nTo use this feature:\n1. Build a development build: npx expo run:android\n2. Or use EAS Build for production',
        [{ text: 'OK' }]
      );
      throw new Error('PDF generation requires development build');
    }
    
    throw error;
  }
};
