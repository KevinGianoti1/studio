export type Company = 'Maxiforce' | 'Pyramid';

export type Sale = {
  id: string;
  company: Company;
  seller: string;
  group: string;
  projection: number;
  billed: number;
  openBudget: number;
  dailyGoal: number;
  monthlyGoal: number;
  monthlyGoalPercentage: number;
  createdAt: string; // Using string to avoid serialization issues
  campaign?: string; // Optional campaign name derived from campaigns data
};

// A version of Sale where createdAt is a Date object, for use in the UI
export type UIDateSale = Omit<Sale, 'createdAt'> & {
  createdAt: Date;
};


// Data structure for individual seller performance analysis
export type SellerPerformanceData = {
  seller: string;
  billedInPeriod: number;
  monthlyGoal: number;
  monthlyGoalPercentage: number;
  campaigns: Campaign[];
  isActiveToday: boolean;
  summary?: string; // Optional summary from AI, loaded async
  salesPace?: 'Forte' | 'Normal' | 'Lento';
  chartData: {
    date: string; // "yyyy-MM-dd"
    sales: number;
    projection: number;
  }[];
};

export type Campaign = {
  rowId: number; // The original row number in the sheet, for updates/deletes
  name: string;
  startDate: Date;
  endDate: Date;
  description: string;
};

// Data structure for the 1:1 meetings, now with all fields
export type Meeting = {
  evaluationDate: string;
  seller: string;
  prospeccao: number;
  qualificacao: number;
  apresentacao: number;
  objecoes: number;
  fechamento: number;
  followUp: number;
  gapsIdentified?: string;
  courseSuggestions?: string;
  nextEvaluationDate?: string;
};

// Data structure for the Sell Out report
export type SellOutEntry = {
    [key: string]: any; // Allow any string key
};

export type YearlyClientReport = {
    clientName: string;
    yearlyData: {
        year: number;
        monthlySales: (number | null)[]; // Array of 12 months, null if no sales
        total: number;
    }[];
};

export type ProductStats = {
    year: number;
    productCode: string;
    description: string;
    totalQuantity: number;
    sharePercentage: number; // New field for participation percentage
    minPrice: number;
    avgPrice: number;
    maxPrice: number;
    sellers?: string[]; // Optional: list of sellers for this product
};

export type SellOutAnalysisInput = {
    productStats: ProductStats[],
    year: string;
};

// Represents a single row in the 'Entregaveis' sheet
export type Deliverable = {
  id: string;
  date: string;
  seller: string;
  team: string;
  callsGoal: number;
  callsMade: number;
  proposalsGoal: number;
  proposalsMade: number;
  videosGoal: number;
  videosMade: number;
};

// UI version with Date object
export type UIDeliverable = Omit<Deliverable, 'date'> & {
  date: Date;
};

// New types for the Deliverables Competition Dashboard
export type DeliverableCategory = 'calls' | 'proposals' | 'videos';

export type SellerDeliverableStats = {
  seller: string;
  team: string;
  totalScore: number;
  isKingOfTheDay: boolean;
  bestCategory: DeliverableCategory | 'generalist';
  weeklyStreak: number[]; // Array of 7, 1 for goal met, 0 otherwise
  metrics: {
    [key in DeliverableCategory]: {
      goal: number;
      made: number;
      percentage: number;
    }
  }
};

export type TeamDeliverableStats = {
  team: 'Maxiforce' | 'Pyramid';
  avgScore: number;
  totalMade: {
    calls: number;
    proposals: number;
    videos: number;
  };
};

export type RecordBreaker = {
  category: DeliverableCategory;
  seller: string;
  value: number;
};


// For Competition Page
export type CompetitionSalesData = {
    seller: string;
    team: string;
    totalBilled: number;
    goalPercentage: number;
    calls: number;
    proposals: number;
    videos: number;
};

export type CompetitionDeliverablesData = {
    seller: string;
    team: string;
    callsMade: number;
    proposalsMade: number;
    videosMade: number;
}

export type LeaderboardEntry = {
    seller: string;
    team: string;
    value: string | number;
}


// For Dynamic Accelerators
export type AcceleratorRule = {
  id: string;
  label: string;
  metaPercent: number; // The % of the monthly goal to be achieved
  bonus: number;       // The bonus commission % (e.g., 0.01 for 1%)
  deadline: Date;
};

export type Achievement = {
  achievementId: string; // "SellerName-RuleId"
};
