// src/api/estimate/controllers/estimate.ts
// This file should be placed in your Strapi backend at: src/api/estimate/controllers/estimate.ts

import { factories } from '@strapi/strapi'
import { Resend } from 'resend'

// ============================================
// PRICING CONSTANTS - Single source of truth!
// ============================================

const BASE_PRICES = {
  landing: { min: 2000, max: 4000 },
  marketing: { min: 4000, max: 8000 },
  ecommerce: { min: 7000, max: 12000 },
  webapp: { min: 8000, max: 15000 },
  retainer: { min: 3000, max: 6000 },
}

const SCOPE_CONFIG = {
  webapp: {
    baseScreens: 5,
    perExtraScreen: 0.05,
    maxMultiplier: 0.5, // Max 1.5x total
  },
  website: {
    basePages: 3,
    perExtraPage: 0.08,
    maxMultiplier: 0.8, // Max 1.8x total
  },
}

const MULTIPLIERS = {
  contentReady: 0.9,
  designReady: 0.85,
}

const FEATURE_COSTS = {
  cms: { min: 1500, max: 2500 },
  auth: { min: 1200, max: 2000 },
  stripe: { min: 1800, max: 3000 },
  adminDashboard: { min: 2500, max: 4000 },
  apiIntegration: { min: 400, max: 800 }, // Per integration
  advancedAnimations: { min: 800, max: 1500 },
  seoOptimization: { min: 600, max: 1000 },
  analyticsSetup: { min: 400, max: 700 },
  multiRolePermissions: { min: 1800, max: 3000 },
}

const TIMELINE_BASE_WEEKS = {
  landing: 2,
  marketing: 3,
  ecommerce: 6,
  webapp: 8,
  retainer: 0, // Ongoing
}

const TIMELINE_ADDITIONS = {
  perExtraScreen: 0.3, // ~3 days per extra screen (webapp)
  perExtraPage: 0.4, // ~2-3 days per extra page (websites)
  contentNotReady: 1,
  designNotReady: 2,
  features: {
    auth: 0.5,
    stripe: 1,
    adminDashboard: 2,
    apiIntegrationEach: 0.3,
    multiRolePermissions: 1,
    cms: 1,
  },
}

export default factories.createCoreController(
  'api::estimate.estimate',
  ({ strapi }) => ({
    async submitEstimate(ctx) {
      console.log('📝 Processing estimate submission...')
      try {
        const {
          name,
          email,
          company,
          currentWebsiteUrl,
          targetAudience,
          goals,
          projectType,
          pageCount,
          screenCount,
          contentReady,
          designReady,
          needsCMS,
          features,
          budgetRange,
          idealLaunchDate,
        } = ctx.request.body

        // Validate required fields
        if (
          !name ||
          !email ||
          !projectType ||
          !budgetRange ||
          !targetAudience
        ) {
          return ctx.badRequest('Missing required fields')
        }

        // Save to database
        const entry = await strapi.entityService.create(
          'api::estimate.estimate',
          {
            data: {
              name,
              email,
              company,
              currentWebsiteUrl,
              targetAudience,
              goals,
              projectType,
              pageCount,
              screenCount,
              contentReady,
              designReady,
              needsCMS,
              features,
              budgetRange,
              idealLaunchDate,
              publishedAt: new Date(),
            },
          }
        )

        console.log('✅ Saved to database:', entry.id)

        // Initialize Resend
        const resend = new Resend(process.env.RESEND_API_KEY)

        if (!process.env.RESEND_API_KEY) {
          console.error('❌ RESEND_API_KEY not configured')
          return ctx.internalServerError('Email service not configured')
        }

        // Calculate estimate
        const estimate = calculateEstimate({
          projectType,
          pageCount,
          screenCount,
          contentReady,
          designReady,
          needsCMS,
          features,
        })

        // Calculate timeline
        const timeline = calculateTimeline({
          projectType,
          pageCount,
          screenCount,
          contentReady,
          designReady,
          needsCMS,
          features,
          idealLaunchDate,
        })

        // Check for budget mismatch
        const budgetMismatch = checkBudgetMismatch(budgetRange, estimate)

        // ===== EMAIL 1: Send to ADMIN (you) =====
        const adminEmail = await resend.emails.send({
          from: process.env.EMAIL_DEFAULT_FROM || 'onboarding@resend.dev',
          to: process.env.EMAIL_TO?.split(',') || ['your-email@example.com'],
          replyTo: email,
          subject: `${budgetMismatch ? '⚠️ ' : '🎯 '}New Estimate: ${name} - ${formatBudgetRange(budgetRange)}`,
          html: getAdminEmailHTML({
            name,
            email,
            company,
            currentWebsiteUrl,
            targetAudience,
            goals,
            projectType,
            pageCount,
            screenCount,
            contentReady,
            designReady,
            needsCMS,
            features,
            budgetRange,
            idealLaunchDate,
            estimate,
            budgetMismatch,
            timeline,
          }),
        })

        if (adminEmail.error) {
          console.error('❌ Failed to send admin email:', adminEmail.error)
        } else {
          console.log('✅ Admin email sent:', adminEmail.data?.id)
        }

        // ===== EMAIL 2: Send to CUSTOMER (confirmation) =====
        const customerEmail = await resend.emails.send({
          from: process.env.EMAIL_DEFAULT_FROM || 'onboarding@resend.dev',
          to: email,
          subject: `Your Project Estimate - ${formatProjectType(projectType)}`,
          html: getCustomerEmailHTML({
            name,
            email,
            company,
            currentWebsiteUrl,
            targetAudience,
            goals,
            projectType,
            pageCount,
            screenCount,
            contentReady,
            designReady,
            needsCMS,
            features,
            budgetRange,
            idealLaunchDate,
            estimate,
            timeline,
          }),
        })

        if (customerEmail.error) {
          console.error(
            '❌ Failed to send customer email:',
            customerEmail.error
          )
        } else {
          console.log(
            '✅ Customer confirmation email sent:',
            customerEmail.data?.id
          )
        }

        ctx.body = {
          success: true,
          message: 'Estimate request submitted successfully',
          data: entry,
        }
      } catch (err) {
        console.error('❌ Estimate submission error:', err)
        return ctx.internalServerError('Failed to submit estimate')
      }
    },
  })
)

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatBudgetRange(range: string): string {
  const ranges: Record<string, string> = {
    under_2500: 'Under $2.5k',
    range_2500_5000: '$2.5k-$5k',
    range_5000_10000: '$5k-$10k',
    range_10000_20000: '$10k-$20k',
    over_20000: '$20k+',
  }
  return ranges[range] || range
}

function checkBudgetMismatch(
  budgetRange: string,
  estimate: { min: number; max: number }
): boolean {
  const budgetMaxValues: Record<string, number> = {
    under_2500: 2500,
    range_2500_5000: 5000,
    range_5000_10000: 10000,
    range_10000_20000: 20000,
    over_20000: Infinity,
  }

  const budgetMax = budgetMaxValues[budgetRange]
  return estimate.min > budgetMax
}

function calculateEstimate(data: {
  projectType: string
  pageCount: number
  screenCount: number
  contentReady: boolean
  designReady: boolean
  needsCMS: boolean
  features: {
    auth: boolean
    stripe: boolean
    adminDashboard: boolean
    apiIntegrations: number
    advancedAnimations: boolean
    seoOptimization: boolean
    analyticsSetup: boolean
    multiRolePermissions: boolean
  }
}): { min: number; max: number } {
  let baseMin = 0
  let baseMax = 0

  // FIXED: More realistic pricing for solo freelancer ($50-80/hr range)
  const basePrice = BASE_PRICES[data.projectType]
  if (basePrice) {
    baseMin = basePrice.min
    baseMax = basePrice.max
  }

  // FIXED: Reduced scope multiplier from unlimited to capped at 1.5x for webapps, 1.8x for websites
  let scopeMultiplier = 1
  if (data.projectType === 'webapp') {
    // For web apps: much gentler growth, capped at 1.5x
    const config = SCOPE_CONFIG.webapp
    const baseScreens = config.baseScreens
    const extraScreens = Math.max(0, data.screenCount - baseScreens)
    scopeMultiplier =
      1 + Math.min(extraScreens * config.perExtraScreen, config.maxMultiplier) // Max 1.5x at ~15 screens
  } else if (data.projectType !== 'retainer') {
    // For websites: gentler growth, capped at 1.8x
    const config = SCOPE_CONFIG.website
    const basePages = config.basePages
    const extraPages = Math.max(0, data.pageCount - basePages)
    scopeMultiplier =
      1 + Math.min(extraPages * config.perExtraPage, config.maxMultiplier) // Max 1.8x at ~13 pages
  }

  baseMin *= scopeMultiplier
  baseMax *= scopeMultiplier

  if (data.contentReady) {
    baseMin *= MULTIPLIERS.contentReady
    baseMax *= MULTIPLIERS.contentReady
  }
  if (data.designReady) {
    baseMin *= MULTIPLIERS.designReady
    baseMax *= MULTIPLIERS.designReady
  }

  // CMS
  if (data.needsCMS) {
    const cmsCost = FEATURE_COSTS.cms
    baseMin += cmsCost.min
    baseMax += cmsCost.max // Tightened from 4000 (67% variance instead of 133%)
  }

  // Features - FIXED: Tightened variance from 100% to 50-67% for more professional estimates
  if (data.features.auth) {
    const authCost = FEATURE_COSTS.auth
    baseMin += authCost.min
    baseMax += authCost.max // Was 1500-3000, now ~67% variance
  }
  if (data.features.stripe) {
    const stripeCost = FEATURE_COSTS.stripe
    baseMin += stripeCost.min
    baseMax += stripeCost.max // Was 2000-4000, now ~67% variance
  }
  if (data.features.adminDashboard) {
    const adminDashboardCost = FEATURE_COSTS.adminDashboard
    baseMin += adminDashboardCost.min
    baseMax += adminDashboardCost.max // Was 3000-6000, now ~60% variance
  }
  // API integrations - reduced from $1k-$2k to $400-$800 each
  if (data.features.apiIntegrations > 0) {
    const apiIntegrationCost = FEATURE_COSTS.apiIntegration
    baseMin += data.features.apiIntegrations * apiIntegrationCost.min
    baseMax += data.features.apiIntegrations * apiIntegrationCost.max
  }
  if (data.features.advancedAnimations) {
    const advancedAnimationsCost = FEATURE_COSTS.advancedAnimations
    baseMin += advancedAnimationsCost.min
    baseMax += advancedAnimationsCost.max // Was 1000-2500, now ~88% variance
  }
  if (data.features.seoOptimization) {
    const seoOptimizationCost = FEATURE_COSTS.seoOptimization
    baseMin += seoOptimizationCost.min
    baseMax += seoOptimizationCost.max // Was 800-1500, now ~67% variance
  }
  if (data.features.analyticsSetup) {
    const analyticsSetupCost = FEATURE_COSTS.analyticsSetup
    baseMin += analyticsSetupCost.min
    baseMax += analyticsSetupCost.max // Was 500-1000, now ~75% variance
  }
  if (data.features.multiRolePermissions) {
    const multiRolePermissionsCost = FEATURE_COSTS.multiRolePermissions
    baseMin += multiRolePermissionsCost.min
    baseMax += multiRolePermissionsCost.max // Was 2000-4000, now ~67% variance
  }

  return {
    min: Math.round(baseMin),
    max: Math.round(baseMax),
  }
}

function calculateTimeline(data: {
  projectType: string
  pageCount: number
  screenCount: number
  contentReady: boolean
  designReady: boolean
  needsCMS: boolean
  features: {
    auth: boolean
    stripe: boolean
    adminDashboard: boolean
    apiIntegrations: number
    advancedAnimations: boolean
    seoOptimization: boolean
    analyticsSetup: boolean
    multiRolePermissions: boolean
  }
  idealLaunchDate: string
}): string {
  let weeksNeeded = 2 // Minimum baseline

  // Base time by project type
  const baseWeeks = TIMELINE_BASE_WEEKS[data.projectType]
  if (baseWeeks !== undefined) {
    weeksNeeded = baseWeeks
  }

  // Add time for scope (pages/screens)
  if (data.projectType === 'webapp') {
    const extraScreens = Math.max(
      0,
      data.screenCount - SCOPE_CONFIG.webapp.baseScreens
    )
    weeksNeeded += Math.floor(extraScreens * TIMELINE_ADDITIONS.perExtraScreen) // ~3 days per extra screen
  } else if (
    data.projectType !== 'retainer' &&
    data.projectType !== 'landing'
  ) {
    const extraPages = Math.max(
      0,
      data.pageCount - SCOPE_CONFIG.website.basePages
    )
    weeksNeeded += Math.floor(extraPages * TIMELINE_ADDITIONS.perExtraPage) // ~2-3 days per extra page
  }

  // Add time for content/design work
  if (!data.contentReady) weeksNeeded += TIMELINE_ADDITIONS.contentNotReady
  if (!data.designReady) weeksNeeded += TIMELINE_ADDITIONS.designNotReady

  // Add time for complex features
  if (data.features.auth) weeksNeeded += TIMELINE_ADDITIONS.features.auth
  if (data.features.stripe) weeksNeeded += TIMELINE_ADDITIONS.features.stripe
  if (data.features.adminDashboard)
    weeksNeeded += TIMELINE_ADDITIONS.features.adminDashboard
  if (data.features.multiRolePermissions)
    weeksNeeded += TIMELINE_ADDITIONS.features.multiRolePermissions
  if (data.features.apiIntegrations > 0)
    weeksNeeded +=
      data.features.apiIntegrations *
      TIMELINE_ADDITIONS.features.apiIntegrationEach
  if (data.needsCMS) weeksNeeded += TIMELINE_ADDITIONS.features.cms

  // Round to whole or half weeks
  weeksNeeded = Math.ceil(weeksNeeded * 2) / 2

  // Check their desired launch date
  if (data.idealLaunchDate) {
    const launchDate = new Date(data.idealLaunchDate)
    const currentDate = new Date()
    const timeDiff = launchDate.getTime() - currentDate.getTime()
    const weeksUntilLaunch = Math.floor(timeDiff / (1000 * 3600 * 24 * 7))

    // If they want it sooner than realistic, show rush timeline
    if (weeksUntilLaunch < weeksNeeded * 0.7) {
      return `${Math.max(2, Math.floor(weeksNeeded * 0.7))}-${weeksNeeded} weeks (Rush timeline)`
    }

    // If their date aligns with realistic timeline
    if (
      weeksUntilLaunch >= weeksNeeded &&
      weeksUntilLaunch <= weeksNeeded * 1.5
    ) {
      return `${weeksNeeded}-${Math.ceil(weeksNeeded * 1.2)} weeks`
    }

    // If they have plenty of time, show flexible range
    if (weeksUntilLaunch > weeksNeeded * 1.5) {
      return `${weeksNeeded}-${Math.ceil(weeksNeeded * 1.3)} weeks (Flexible timeline)`
    }
  }

  // Default range if no date provided
  return `${weeksNeeded}-${Math.ceil(weeksNeeded * 1.3)} weeks`
}

function formatProjectType(type: string): string {
  const types: Record<string, string> = {
    landing: 'Landing Page',
    marketing: 'Marketing Website',
    ecommerce: 'E-commerce Platform',
    webapp: 'Web Application',
    retainer: 'Monthly Retainer',
  }
  return types[type] || type
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Not specified'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function extractTimelineLabel(timeline: string): string {
  if (timeline.includes('Rush timeline')) {
    return 'Rush timeline'
  } else if (timeline.includes('Flexible timeline')) {
    return 'Flexible timeline'
  }
  return 'Standard timeline'
}

function getAdminEmailHTML(data: any): string {
  const featuresText = Object.entries(data.features)
    .filter(
      ([key, value]) =>
        value === true || (typeof value === 'number' && value > 0)
    )
    .map(
      ([key, value]) =>
        `<li style="margin-bottom: 5px;">${key}: ${value === true ? 'Yes' : value}</li>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #3d4654 0%, #2d3644 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎯 New Estimate Request</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Someone wants to work with you!</p>
            </td>
          </tr>
          
          ${
            data.budgetMismatch
              ? `
          <tr>
            <td style="padding: 20px 30px; background-color: #fff3cd; border-bottom: 2px solid #ffc107;">
              <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 600;">
                ⚠️ <strong>Budget Alert:</strong> Client's budget (${formatBudgetRange(data.budgetRange)}) is below calculated estimate ($${data.estimate.min.toLocaleString()}-$${data.estimate.max.toLocaleString()})
              </p>
            </td>
          </tr>
          `
              : ''
          }
          
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #FCBF28;">
              <p style="margin: 0; color: #3d4654; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Estimated Project Value</p>
              <p style="margin: 10px 0 5px; color: #3d4654; font-size: 36px; font-weight: bold;">$${data.estimate.min.toLocaleString()} - $${data.estimate.max.toLocaleString()}</p>
              <p style="margin: 5px 0 0; color: #3d4654; font-size: 14px;">Client Budget: <strong>${formatBudgetRange(data.budgetRange)}</strong></p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; color: #3d4654; font-size: 20px; font-weight: bold;">Contact Information</h2>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${data.name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${data.email}" style="color: #FCBF28;">${data.email}</a></p>
              ${data.company ? `<p style="margin: 5px 0;"><strong>Company:</strong> ${data.company}</p>` : ''}
              ${data.currentWebsiteUrl ? `<p style="margin: 5px 0;"><strong>Current Website:</strong> <a href="${data.currentWebsiteUrl}" style="color: #FCBF28;">${data.currentWebsiteUrl}</a></p>` : ''}
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 15px; color: #3d4654; font-size: 20px; font-weight: bold;">Target Audience</h2>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #FCBF28;">
                <p style="margin: 0; color: #3d4654; font-size: 15px; line-height: 1.6;">${data.targetAudience}</p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 15px; color: #3d4654; font-size: 20px; font-weight: bold;">Project Goals</h2>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #FCBF28;">
                <p style="margin: 0; color: #3d4654; font-size: 15px; line-height: 1.6;">${data.goals}</p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 15px; color: #3d4654; font-size: 20px; font-weight: bold;">Project Details</h2>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${formatProjectType(data.projectType)}</p>
              <p style="margin: 5px 0;"><strong>${data.projectType === 'webapp' ? 'Screens' : 'Pages'}:</strong> ${data.projectType === 'webapp' ? data.screenCount : data.pageCount}</p>
              <p style="margin: 5px 0;"><strong>Timeline:</strong> ${data.timeline}</p>
              <p style="margin: 5px 0;"><strong>Timeline Type:</strong> ${extractTimelineLabel(data.timeline)}</p>
              <p style="margin: 5px 0;"><strong>Content Ready:</strong> ${data.contentReady ? '✅ Yes' : '❌ No'}</p>
              <p style="margin: 5px 0;"><strong>Design Ready:</strong> ${data.designReady ? '✅ Yes' : '❌ No'}</p>
              <p style="margin: 5px 0;"><strong>CMS Needed:</strong> ${data.needsCMS ? '✅ Yes' : '❌ No'}</p>
              <p style="margin: 5px 0;"><strong>Ideal Launch:</strong> ${formatDate(data.idealLaunchDate)}</p>
            </td>
          </tr>
          
          ${
            featuresText
              ? `
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 15px; color: #3d4654; font-size: 20px; font-weight: bold;">Selected Features</h2>
              <ul style="margin: 0; padding-left: 20px; color: #3d4654; font-size: 15px; line-height: 1.8;">
                ${featuresText}
              </ul>
            </td>
          </tr>
          `
              : ''
          }
          
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="mailto:${data.email}" style="display: inline-block; background: linear-gradient(135deg, #3d4654 0%, #2d3644 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📧 Reply to ${data.name}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

function getCustomerEmailHTML(data: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #3d4654 0%, #2d3644 100%); padding: 40px 30px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: #FCBF28; border-radius: 50%; margin: 0 auto 20px; line-height: 60px; font-size: 30px;">✅</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Thank You, ${data.name}!</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your estimate request has been received</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0; color: #3d4654; font-size: 16px; line-height: 1.6;">
                Thanks for reaching out! I've received your project estimate request and I'm excited to learn more. Here's a summary:
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background: linear-gradient(135deg, #FCBF28 0%, #e5ab1a 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <p style="margin: 0; color: #3d4654; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Estimated Investment</p>
                <p style="margin: 10px 0 5px; color: #3d4654; font-size: 36px; font-weight: bold;">$${data.estimate.min.toLocaleString()} - $${data.estimate.max.toLocaleString()}</p>
                <p style="margin: 0; color: #3d4654; font-size: 13px; opacity: 0.8;">*Final pricing determined after scoping call</p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 20px; color: #3d4654; font-size: 20px; font-weight: bold;">Your Project Summary</h2>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${formatProjectType(data.projectType)}</p>
              <p style="margin: 5px 0;"><strong>Scope:</strong> ${data.projectType === 'webapp' ? data.screenCount : data.pageCount} ${data.projectType === 'webapp' ? 'screens' : 'pages'}</p>
              <p style="margin: 5px 0;"><strong>Timeline:</strong> ${data.timeline}</p>
              <p style="margin: 5px 0;"><strong>Budget Range:</strong> ${formatBudgetRange(data.budgetRange)}</p>
              <p style="margin: 5px 0;"><strong>Ideal Launch:</strong> ${formatDate(data.idealLaunchDate)}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 20px; color: #3d4654; font-size: 20px; font-weight: bold;">What's Next?</h2>
              <div style="margin-bottom: 15px;">
                <strong style="color: #FCBF28;">1.</strong> <strong>I'll Review Your Request</strong><br>
                <span style="color: #6c757d; font-size: 14px;">I'll review your details and prepare initial thoughts.</span>
              </div>
              <div style="margin-bottom: 15px;">
                <strong style="color: #FCBF28;">2.</strong> <strong>Let's Schedule a Call</strong><br>
                <span style="color: #6c757d; font-size: 14px;">We'll have a 15-minute scoping call to discuss your vision.</span>
              </div>
              <div>
                <strong style="color: #FCBF28;">3.</strong> <strong>Receive Your Proposal</strong><br>
                <span style="color: #6c757d; font-size: 14px;">You'll get a detailed proposal with timeline and deliverables.</span>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 40px;">
              <div style="background-color: rgba(252, 191, 40, 0.1); border: 2px solid rgba(252, 191, 40, 0.3); border-radius: 12px; padding: 25px; text-align: center;">
                <h3 style="margin: 0 0 10px; color: #3d4654; font-size: 18px; font-weight: bold;">Ready to Get Started?</h3>
                <p style="margin: 0 0 10px; color: #6c757d; font-size: 14px;">I typically respond within 24 hours!</p>
                <p style="margin: 0; color: #6c757d; font-size: 13px; font-style: italic;">You can reply directly to this email with any questions.</p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
              <p style="margin: 0 0 5px; color: #3d4654; font-size: 14px; font-weight: 600;">Jesse Smith</p>
              <p style="margin: 0; color: #6c757d; font-size: 13px;">Full-Stack Developer</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
