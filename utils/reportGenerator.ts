import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

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
};

/**
 * Generate HTML content for the PDF report
 */
const generateReportHTML = (
  userName: string,
  triggers: TriggerData[],
  summary: {
    totalTriggers: number;
    avgAqi: number;
    mostCommonCategory: string;
    worstLocation: string;
    dateRange: string;
  }
): string => {
  const triggersHTML = triggers
    .map(
      (trigger, index) => `
    <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${index + 1}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">
        ${new Date(trigger.timestamp).toLocaleDateString()}<br/>
        <span style="color: #6b7280; font-size: 12px;">
          ${new Date(trigger.timestamp).toLocaleTimeString()}
        </span>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">
        <strong style="color: ${getAQIColor(trigger.aqi || 0)}">
          ${trigger.aqi || 'N/A'}
        </strong><br/>
        <span style="font-size: 11px; color: #6b7280;">${trigger.category || 'Unknown'}</span>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">
        ${trigger.temperature?.toFixed(1) || 'N/A'}°C
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">
        ${trigger.humidity?.toFixed(0) || 'N/A'}%
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">
        PM2.5: ${trigger.pm25?.toFixed(1) || 'N/A'}<br/>
        PM10: ${trigger.pm10?.toFixed(1) || 'N/A'}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Asthma Trigger Report</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1f2937;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #6366f1;
            margin: 0;
            font-size: 32px;
          }
          .header p {
            color: #6b7280;
            margin: 10px 0 0 0;
            font-size: 14px;
          }
          .patient-info {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
          }
          .patient-info h2 {
            margin: 0 0 15px 0;
            font-size: 20px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          .summary-card h3 {
            color: #6b7280;
            font-size: 12px;
            margin: 0 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .summary-card .value {
            color: #6366f1;
            font-size: 28px;
            font-weight: bold;
            margin: 0;
          }
          .summary-card .label {
            color: #9ca3af;
            font-size: 11px;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th {
            background: #6366f1;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            font-size: 13px;
          }
          .section-title {
            color: #1f2937;
            font-size: 20px;
            margin: 30px 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #9ca3af;
            font-size: 11px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          .insights {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
          }
          .insights h3 {
            color: #92400e;
            margin: 0 0 10px 0;
            font-size: 16px;
          }
          .insights ul {
            margin: 10px 0;
            padding-left: 20px;
            color: #78350f;
          }
          .insights li {
            margin: 8px 0;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🫁 Asthma Trigger Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="patient-info">
          <h2>👤 Patient Information</h2>
          <p><strong>Name:</strong> ${userName}</p>
          <p><strong>Report Period:</strong> ${summary.dateRange}</p>
        </div>

        <h2 class="section-title">📊 Summary Statistics</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Triggers</h3>
            <p class="value">${summary.totalTriggers}</p>
            <p class="label">Inhaler uses recorded</p>
          </div>
          <div class="summary-card">
            <h3>Average AQI</h3>
            <p class="value">${summary.avgAqi}</p>
            <p class="label">${summary.mostCommonCategory}</p>
          </div>
        </div>

        <div class="insights">
          <h3>💡 Key Insights</h3>
          <ul>
            <li><strong>Most Common Air Quality:</strong> ${summary.mostCommonCategory} - This was the most frequent air quality category during your inhaler uses.</li>
            <li><strong>Average AQI Level:</strong> ${summary.avgAqi} - ${getAQIDescription(summary.avgAqi)}</li>
            ${triggers.length > 0 ? `<li><strong>Recent Activity:</strong> Last inhaler use was on ${new Date(triggers[0].timestamp).toLocaleDateString()}</li>` : ''}
            <li><strong>Recommendation:</strong> ${getRecommendation(summary.avgAqi, summary.mostCommonCategory)}</li>
          </ul>
        </div>

        <h2 class="section-title">📋 Detailed Trigger History</h2>
        ${
          triggers.length > 0
            ? `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date & Time</th>
              <th>Air Quality</th>
              <th>Temperature</th>
              <th>Humidity</th>
              <th>Pollutants</th>
            </tr>
          </thead>
          <tbody>
            ${triggersHTML}
          </tbody>
        </table>
        `
            : '<p style="text-align: center; color: #9ca3af; padding: 40px;">No trigger data available</p>'
        }

        <div class="footer">
          <p>This report was generated by QAir - Smart Asthma Management App</p>
          <p>© 2025 QAir. For medical advice, please consult your healthcare provider.</p>
        </div>
      </body>
    </html>
  `;
};

const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return '#10b981'; // Good - Green
  if (aqi <= 100) return '#fbbf24'; // Moderate - Yellow
  if (aqi <= 150) return '#f97316'; // Unhealthy for Sensitive - Orange
  if (aqi <= 200) return '#ef4444'; // Unhealthy - Red
  if (aqi <= 300) return '#a855f7'; // Very Unhealthy - Purple
  return '#7f1d1d'; // Hazardous - Maroon
};

const getAQIDescription = (aqi: number): string => {
  if (aqi <= 50) return 'Good air quality, generally safe for outdoor activities.';
  if (aqi <= 100) return 'Moderate air quality, acceptable but some pollutants may be a concern.';
  if (aqi <= 150) return 'Unhealthy for sensitive groups. Consider limiting outdoor exposure.';
  if (aqi <= 200) return 'Unhealthy air quality. Everyone should limit outdoor activities.';
  if (aqi <= 300) return 'Very unhealthy. Avoid outdoor activities.';
  return 'Hazardous conditions. Stay indoors and keep windows closed.';
};

const getRecommendation = (avgAqi: number, category: string): string => {
  if (avgAqi <= 50) {
    return 'Your triggers occurred in good air quality. Focus on identifying other potential triggers like allergens or temperature changes.';
  } else if (avgAqi <= 100) {
    return 'Consider monitoring air quality before outdoor activities and using your rescue inhaler as prescribed.';
  } else if (avgAqi <= 150) {
    return 'Air quality appears to be a significant trigger. Limit outdoor exposure on high pollution days and consider using air purifiers indoors.';
  } else {
    return 'Poor air quality is a major trigger for you. Consult your doctor about preventive measures and consider staying indoors when AQI is elevated.';
  }
};

/**
 * Generate and share PDF report of asthma triggers
 */
export const generateAndShareReport = async (): Promise<void> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No user found');
    }

    const userName = user.user_metadata?.full_name || 'QAir User';

    // Fetch all triggers from database
    const { data: triggers, error } = await supabase
      .from('inhaler_triggers')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch trigger data');
    }

    if (!triggers || triggers.length === 0) {
      throw new Error('No trigger data available to generate report');
    }

    // Calculate summary statistics
    const totalTriggers = triggers.length;
    const avgAqi = Math.round(
      triggers.reduce((sum, t) => sum + (t.aqi || 0), 0) / triggers.length
    );

    // Find most common category
    const categoryCounts: { [key: string]: number } = {};
    triggers.forEach((t) => {
      const cat = t.category || 'Unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const mostCommonCategory =
      Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a])[0] || 'Unknown';

    // Date range
    const oldestDate = new Date(triggers[triggers.length - 1].timestamp);
    const newestDate = new Date(triggers[0].timestamp);
    const dateRange = `${oldestDate.toLocaleDateString()} - ${newestDate.toLocaleDateString()}`;

    const summary = {
      totalTriggers,
      avgAqi,
      mostCommonCategory,
      worstLocation: 'Various locations',
      dateRange,
    };

    // Generate HTML
    const html = generateReportHTML(userName, triggers, summary);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({ html });

    console.log('PDF generated at:', uri);

    // Share the PDF
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Asthma Trigger Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error: any) {
    console.error('Error generating report:', error);
    throw error;
  }
};
