# Market Economics Analysis: Layered Incentive Structures

## Executive Summary

**Key Insight #2**: Fantasy sports thrive despite hefty operator fees, showing that games deliver utility beyond their expected monetary value.

**Key Insight #1**: The fantasy sports model—using a tournament to interpret real-world events according to rules—can be applied to any event stream.

**Key Insight #1**: Integrating a prediction market into a tournament

This document proposes an incentive structure that fuses a tournament with a prediction market. In the tournament, agents compete to interpret and forecast real-world events; in the prediction market, speculators wager on which agents will outrank the rest. Dynamic rebalancing of incentives between the games create interest and rewards that exceed what either game offers alone.

This hybrid mechanism can model a wide range of principal–agent relationships and provide a standardized framework to design and deploy group coordination incentives.

## Hybrid Structure

### Primary Layer: Tournament

1. Agents purchase entry into tournament
2. Agents compete to correctly predict outcomes of real-world events
3. Oracle ranks Agents according to tournament rules
4. Agents are paid based on relative performance

### Secondary Layer: Prediction Market

1. Agents purchase shares of tournament outcomes
2. Agents are paid based on relative performance

## Incentive Rebalancing

Rebalancing redirects incoming payments between the primary and secondary layers to maintain target ratios or achieve strategic goals. As new participants enter either market, the smart contract can allocate a portion of their fees to subsidize the other side, creating cross-market incentives that wouldn't exist if the games ran independently. This dynamic allocation lets us shift the economic balance to favor different outcomes—for example, subsidizing tournament entry to attract more competitors, or channeling funds into prediction markets to deepen liquidity and information quality.

We accomplish rebalancing through two primary tools. **Biasing** adjusts the rebalancing parameters to prefer one layer over the other, directing a larger share of incoming payments to create economic advantages for targeted participants. **Gating** uses access control lists to restrict who can join one or both sides of the market, preventing natural rebalancing and locking in structural advantages. Together, these tools let us engineer markets that achieve goals beyond simple winner-takes-all competitions or pure prediction games.

## Biased & Gated Scenarios

The following four scenarios form a 2×2 grid based on which layer receives bias (subsidy) and which layer is gated (access-controlled):

|                    | **Gate Primary**     | **Gate Secondary** |
| ------------------ | -------------------- | ------------------ |
| **Bias Primary**   | OnlyFans/Patreon     | Search Engine      |
| **Bias Secondary** | Advertising Platform | Pay-to-Apply       |

### OnlyFans/Patreon Model

_Bias towards Primary + Gate Primary_

**Market Structure**:

- **Base**: Content value and fan engagement outcomes
- **Primary**: Content creation and fan interaction competition
- **Secondary**: Prediction markets around content performance and creator success

**Rebalancing Lock**: Prevents secondary-side growth to maintain creator monopoly power
**Incentive Dynamics**: Creators capture full economic value; fans pay premium for exclusive access
**Win-Win Outcome**: High-quality content production meets dedicated fan communities

### Pay-to-Apply Model

_Bias towards Secondary + Gate Secondary_

**Market Structure**:

- **Base**: Job match quality and hiring success outcomes
- **Primary**: Resume optimization and application competition
- **Secondary**: Prediction markets around candidate success rates and job market trends

**Rebalancing Lock**: Prevents primary-side competition to maintain employer advantage
**Incentive Dynamics**: Job seekers invest heavily in signaling; employers face curated applicant pools
**Win-Win Outcome**: Quality candidates emerge through competitive signaling

### Search Engine Model

_Bias towards Primary + Gate Secondary_

**Market Structure**:

- **Base**: Search relevance and user satisfaction outcomes
- **Primary**: Query optimization and result interpretation competition
- **Secondary**: Prediction markets around search trends and algorithmic performance

**Rebalancing Lock**: Prevents advertiser-side growth to maintain user focus
**Incentive Dynamics**: Users get free, high-quality search; advertisers compete for attention
**Win-Win Outcome**: Superior search experience funded by efficient ad markets

### Advertising Platform Model

_Bias towards Secondary + Gate Primary_

**Market Structure**:

- **Base**: Content quality and audience engagement outcomes
- **Primary**: Campaign optimization and targeting competition
- **Secondary**: Prediction markets around content performance and audience behavior

**Rebalancing Lock**: Prevents consumer-side monetization to maintain advertiser focus
**Incentive Dynamics**: Advertisers optimize for ROI; consumers get subsidized content
**Win-Win Outcome**: Targeted advertising efficiency meets content accessibility

## Comparative Analysis

### Market Participation Patterns

| Scenario         | Base Focus      | Primary Competition   | Secondary Prediction    | Rebalancing Approach    |
| ---------------- | --------------- | --------------------- | ----------------------- | ----------------------- |
| 1. Creator-Gated | Content quality | Creator rivalry       | Performance prediction  | Lock primary monopoly   |
| 2. Pay-to-Apply  | Match quality   | Applicant signaling   | Success rate prediction | Lock employer advantage |
| 3. Search        | Relevance       | Query optimization    | Trend prediction        | Lock user primacy       |
| 4. Advertise     | Engagement      | Campaign optimization | Behavior prediction     | Lock advertiser focus   |

### Incentive Flow and Win-Win Creation

**No Balancing**:

- Direct value exchange between participants
- Clear economic signals but potential participation gaps
- Win-win through transparent pricing

**Balanced/Biased**:

- Cross-subsidization maintains participation ratios
- Network effects emerge as popularity increases
- Win-win through sustainable participation levels

**Biased & Gated**:

- Locks in competitive advantages for one side
- Creates durable incentive structures
- Win-win through specialized optimization (creators, searchers, applicants, or advertisers)

## Conclusion

The layered incentive structure provides a powerful framework for creating win-win outcomes in two-sided markets. By separating events, competition, and prediction into base, primary, and secondary markets, and implementing active rebalancing mechanisms, platforms can:

1. **Spur Activity**: Clear incentive structures motivate participation at each market
2. **Create Win-Wins**: Rebalancing ensures benefits flow to all participants
3. **Maintain Balance**: Ratio targets prevent market imbalances
4. **Enable Innovation**: Prediction markets create meta-incentives for information revelation

The four biased & gated scenarios demonstrate how locking in specific incentive structures can create durable competitive advantages while still delivering value to both sides of the market. The key insight is that successful platforms don't just balance markets—they strategically structure incentives across markets to create sustainable, win-win dynamics.
