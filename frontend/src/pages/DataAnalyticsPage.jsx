import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, 
  ShoppingCart, Package, Activity, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import Card3D from '../components/Card3D';
import Layout from '../components/Layout';

// Colors for charts based on theme
const COLORS = {
  forest: ['#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac'],
  tomato: ['#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5'],
  gold: ['#854d0e', '#a16207', '#ca8a04', '#eab308', '#facc15', '#fef08a'],
  wheat: ['#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c'],
};

const PIE_COLORS = [COLORS.tomato[2], COLORS.gold[3], COLORS.forest[3], COLORS.wheat[2]];

const DataAnalyticsPage = () => {
  const { user } = useAuth();
  
  // State for all API data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [financials, setFinancials] = useState(null);
  
  const [salesTrends, setSalesTrends] = useState(null);
  const [salesGranularity, setSalesGranularity] = useState('daily');
  
  const [wasteAnalysis, setWasteAnalysis] = useState(null);
  const [productPerformance, setProductPerformance] = useState([]);
  
  const [demandForecast, setDemandForecast] = useState(null);
  const [forecastDays, setForecastDays] = useState(7);
  const [selectedForecastProduct, setSelectedForecastProduct] = useState('');
  
  const [wastePredictions, setWastePredictions] = useState(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch for initial data load
      const [
        financialData,
        salesData,
        wasteData,
        performanceData,
        forecastData,
        predictionsData
      ] = await Promise.all([
        api.getFinancialOverview(),
        api.getSalesTrends(salesGranularity),
        api.getWasteAnalysis(),
        api.getProductPerformance(),
        api.getDemandForecast(forecastDays),
        api.getWastePredictions()
      ]);

      setFinancials(financialData);
      setSalesTrends(salesData);
      setWasteAnalysis(wasteData);
      setProductPerformance(performanceData);
      setDemandForecast(forecastData);
      setWastePredictions(predictionsData);

      if (forecastData?.forecasts?.length > 0 && !selectedForecastProduct) {
        setSelectedForecastProduct(forecastData.forecasts[0].product_name);
      }
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
      setError("Failed to load analytics dashboard. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [salesGranularity, forecastDays, selectedForecastProduct]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Effect specifically for granularity change to avoid full reload if API supports it
  useEffect(() => {
    if (!loading && salesTrends?.granularity !== salesGranularity) {
       api.getSalesTrends(salesGranularity).then(setSalesTrends).catch(console.error);
    }
  }, [salesGranularity, loading]);

  useEffect(() => {
    if (!loading && demandForecast?.days_ahead !== forecastDays) {
       api.getDemandForecast(forecastDays).then(data => {
           setDemandForecast(data);
           if (!data.forecasts.find(f => f.product_name === selectedForecastProduct) && data.forecasts.length > 0) {
               setSelectedForecastProduct(data.forecasts[0].product_name);
           }
       }).catch(console.error);
    }
  }, [forecastDays, loading]);


  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('en-US').format(val || 0);

  if (loading && !financials) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center text-forest-600">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p className="font-mono text-lg animate-pulse">Crunching numbers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-card border-tomato-500 bg-tomato-500/10 p-6 flex flex-col items-center text-center max-w-lg mx-auto">
          <AlertTriangle className="h-12 w-12 text-tomato-500 mb-4" />
          <h2 className="font-display text-2xl text-tomato-600 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-700 font-body mb-6">{error}</p>
          <button onClick={fetchAllData} className="bg-tomato-500 hover:bg-tomato-600 text-white px-6 py-2 rounded-full font-medium transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Find the selected forecast product data
  const currentForecast = demandForecast?.forecasts?.find(f => f.product_name === selectedForecastProduct) || demandForecast?.forecasts?.[0];

  return (
    <Layout>
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl text-forest-900 mb-2">Platform Analytics</h1>
          <p className="font-body text-gray-600 text-lg">Comprehensive insights & AI predictions for Harvest Ledger</p>
        </div>
        <div className="text-sm font-mono text-gray-500 glass-card px-4 py-2 self-start md:self-auto">
          Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* SECTION 1: Financial Overview KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card3D className="bg-gradient-to-br from-forest-50 to-forest-100 border border-forest-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-forest-800 font-mono text-sm mb-1 uppercase tracking-wider">Total Revenue</p>
              <h3 className="font-display text-3xl text-forest-900">{formatCurrency(financials?.total_revenue)}</h3>
            </div>
            <div className="p-3 bg-forest-200 rounded-full">
              <DollarSign className="w-6 h-6 text-forest-700" />
            </div>
          </div>
        </Card3D>
        
        <Card3D className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-800 font-mono text-sm mb-1 uppercase tracking-wider">Purchase Cost</p>
              <h3 className="font-display text-3xl text-blue-900">{formatCurrency(financials?.total_purchase_cost)}</h3>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <ShoppingCart className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </Card3D>
        
        <Card3D className="bg-gradient-to-br from-tomato-50 to-tomato-100 border border-tomato-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-tomato-800 font-mono text-sm mb-1 uppercase tracking-wider">Waste Loss</p>
              <h3 className="font-display text-3xl text-tomato-900">{formatCurrency(financials?.total_waste_loss)}</h3>
            </div>
            <div className="p-3 bg-tomato-200 rounded-full">
              <TrendingDown className="w-6 h-6 text-tomato-700" />
            </div>
          </div>
        </Card3D>
        
        <Card3D className="bg-gradient-to-br from-gold-50 to-gold-100 border border-gold-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gold-800 font-mono text-sm mb-1 uppercase tracking-wider">Net Margin</p>
              <div className="flex items-baseline gap-2">
                 <h3 className="font-display text-3xl text-gold-900">{formatCurrency(financials?.gross_margin)}</h3>
                 <span className="text-sm font-bold bg-gold-200 text-gold-800 px-2 py-0.5 rounded-full">
                    {financials?.gross_margin_pct}%
                 </span>
              </div>
            </div>
            <div className="p-3 bg-gold-200 rounded-full">
              <Activity className="w-6 h-6 text-gold-700" />
            </div>
          </div>
        </Card3D>
      </section>

      {/* SECTION 2: Sales Trends */}
      <section className="glass-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h2 className="font-display text-2xl text-forest-900">Sales Trends</h2>
            <div className="flex gap-4 mt-2 font-mono text-sm">
              <p><span className="text-gray-500">Vol:</span> <span className="font-semibold">{formatNumber(salesTrends?.total_quantity)}</span></p>
              <p><span className="text-gray-500">Rev:</span> <span className="font-semibold text-forest-700">{formatCurrency(salesTrends?.total_revenue)}</span></p>
            </div>
          </div>
          <div className="flex bg-white/50 p-1 rounded-lg border border-wheat-200 mt-4 sm:mt-0">
            {['daily', 'weekly', 'monthly'].map(g => (
              <button 
                key={g}
                onClick={() => setSalesGranularity(g)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${salesGranularity === g ? 'bg-forest-600 text-white shadow' : 'text-gray-600 hover:bg-white'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrends?.trends || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="period" tick={{fill: '#78716c', fontSize: 12}} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fill: '#78716c', fontSize: 12}} tickLine={false} axisLine={false} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [formatCurrency(value), "Revenue"]}
                labelStyle={{ fontWeight: 'bold', color: '#1c1917', marginBottom: '8px' }}
              />
              <Area type="monotone" dataKey="total_revenue" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* SECTION 3: Waste Analysis */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 flex flex-col">
          <h2 className="font-display text-2xl text-forest-900 mb-2">Waste by Reason</h2>
          <div className="flex gap-4 mb-4">
             <div className="bg-tomato-50 px-3 py-2 rounded border border-tomato-100 flex-1">
                <p className="text-xs text-tomato-800 uppercase font-mono mb-1">Total Loss</p>
                <p className="font-display text-xl text-tomato-700">{formatCurrency(wasteAnalysis?.total_financial_loss)}</p>
             </div>
             <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 flex-1">
                <p className="text-xs text-gray-500 uppercase font-mono mb-1">Total Qty</p>
                <p className="font-display text-xl text-gray-800">{formatNumber(wasteAnalysis?.total_waste_quantity)} units</p>
             </div>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wasteAnalysis?.by_reason || []}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  paddingAngle={5} dataKey="quantity" nameKey="reason"
                  label={({reason, percentage}) => `${reason} (${percentage}%)`}
                  labelLine={false}
                >
                  {(wasteAnalysis?.by_reason || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val, name, props) => [`${val} units`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-display text-2xl text-forest-900 mb-6">Top Wasted Products</h2>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(wasteAnalysis?.by_product || []).slice(0, 5)} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e7e5e4" />
                <XAxis type="number" hide />
                <YAxis dataKey="product_name" type="category" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 13}} width={100} />
                <RechartsTooltip 
                  formatter={(value, name) => [value, name === 'total_wasted' ? 'Quantity' : name]}
                  cursor={{fill: '#f3f4f6'}}
                />
                <Bar dataKey="total_wasted" fill="#dc2626" radius={[0, 4, 4, 0]}>
                  {
                    (wasteAnalysis?.by_product || []).slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.tomato[index % COLORS.tomato.length + 1]} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* SECTION 4: Product Performance Table */}
      <section className="glass-card p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl text-forest-900">Product Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-wheat-200 text-sm font-mono text-gray-500 uppercase tracking-wider">
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Sales Vol</th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">Waste Rate</th>
                <th className="p-3">Profitability</th>
                <th className="p-3 text-center">Risk</th>
              </tr>
            </thead>
            <tbody>
              {productPerformance?.map((product, idx) => (
                <tr key={idx} className="border-b border-wheat-100 hover:bg-white/50 transition-colors">
                  <td className="p-3 font-medium text-gray-900 flex items-center gap-2">
                     <Package className="w-4 h-4 text-forest-600" />
                     {product.product_name}
                  </td>
                  <td className="p-3 text-gray-600 text-sm">{product.category}</td>
                  <td className="p-3 text-right text-gray-800">{formatNumber(product.total_sales_qty)}</td>
                  <td className="p-3 text-right font-medium text-forest-700">{formatCurrency(product.total_revenue)}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      product.waste_rate_pct > 15 ? 'bg-tomato-100 text-tomato-800' : 
                      product.waste_rate_pct > 5 ? 'bg-gold-100 text-gold-800' : 'bg-forest-100 text-forest-800'
                    }`}>
                      {product.waste_rate_pct}%
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-forest-500 h-2.5 rounded-full" style={{ width: `${product.profitability_score}%` }}></div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {product.risk_level === 'high' && <span className="inline-block px-3 py-1 bg-tomato-500 text-white text-xs rounded-full font-bold">High</span>}
                    {product.risk_level === 'medium' && <span className="inline-block px-3 py-1 bg-amber-500 text-white text-xs rounded-full font-bold">Med</span>}
                    {product.risk_level === 'low' && <span className="inline-block px-3 py-1 bg-forest-500 text-white text-xs rounded-full font-bold">Low</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 5: AI Demand Forecast */}
      <section className="glass-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-wheat-200 pb-4 gap-4">
          <div>
            <h2 className="font-display text-2xl text-forest-900 flex items-center gap-2">
              <Activity className="text-gold-500" /> AI Demand Forecast
            </h2>
            <p className="text-gray-500 font-body text-sm mt-1">Machine learning predictions based on historical patterns</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={selectedForecastProduct} 
              onChange={(e) => setSelectedForecastProduct(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-forest-500 focus:border-forest-500 block w-full p-2.5"
            >
              {demandForecast?.forecasts?.map(f => (
                <option key={f.product_name} value={f.product_name}>{f.product_name}</option>
              ))}
            </select>
            <div className="flex bg-white/50 p-1 rounded-lg border border-wheat-200 shrink-0">
              {[7, 14, 30].map(days => (
                <button 
                  key={days}
                  onClick={() => setForecastDays(days)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${forecastDays === days ? 'bg-gold-500 text-white shadow' : 'text-gray-600 hover:bg-white'}`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {currentForecast ? (
          <div>
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="bg-forest-50 px-4 py-2 rounded-lg border border-forest-100">
                 <p className="text-xs text-forest-800 uppercase font-mono">Avg Daily Demand</p>
                 <p className="font-display text-2xl text-forest-900">{currentForecast.avg_daily_demand} {currentForecast.unit}</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-2">
                 <p className="text-xs text-gray-500 uppercase font-mono">Trend</p>
                 <div className="flex items-center font-bold">
                    {currentForecast.trend === 'up' && <><TrendingUp className="w-5 h-5 text-forest-500 mr-1"/> Up</>}
                    {currentForecast.trend === 'down' && <><TrendingDown className="w-5 h-5 text-tomato-500 mr-1"/> Down</>}
                    {currentForecast.trend === 'stable' && <><ArrowRight className="w-5 h-5 text-gray-500 mr-1"/> Stable</>}
                 </div>
              </div>
            </div>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={currentForecast.daily_forecast} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="date" tick={{fill: '#78716c', fontSize: 12}} tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, {month:'short', day:'numeric'})} />
                  <YAxis tick={{fill: '#78716c', fontSize: 12}} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px' }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="confidence" fill="#fef08a" stroke="none" name="Confidence Band" opacity={0.5} />
                  <Line type="monotone" dataKey="predicted_qty" stroke="#a16207" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} name="Predicted Demand" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 italic">No forecast data available</div>
        )}
      </section>

      {/* SECTION 6: AI Waste Prediction Alerts */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-tomato-900 flex items-center gap-2">
            <AlertTriangle className="text-tomato-500" /> Waste Risk Predictions
          </h2>
          <div className="bg-tomato-100 text-tomato-800 px-3 py-1 rounded-full text-sm font-bold">
            {wastePredictions?.high_risk_count || 0} High Risk Items
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(wastePredictions?.predictions || [])
            .sort((a, b) => b.waste_risk_score - a.waste_risk_score)
            .map((pred, idx) => (
            <div key={idx} className="glass-card-hover bg-white p-5 border-l-4" style={{borderLeftColor: pred.waste_risk_score > 75 ? '#ef4444' : pred.waste_risk_score > 50 ? '#eab308' : '#22c55e'}}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{pred.product_name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{pred.category}</p>
                </div>
                <div className="relative w-12 h-12 flex items-center justify-center rounded-full border-4" 
                     style={{borderColor: pred.waste_risk_score > 75 ? '#fee2e2' : pred.waste_risk_score > 50 ? '#fef9c3' : '#dcfce3'}}>
                  <span className="font-bold text-sm" style={{color: pred.waste_risk_score > 75 ? '#dc2626' : pred.waste_risk_score > 50 ? '#ca8a04' : '#16a34a'}}>
                    {pred.waste_risk_score}
                  </span>
                  <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                     <path className="text-gray-200" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                     <path strokeWidth="3" strokeDasharray={`${pred.waste_risk_score}, 100`} stroke={pred.waste_risk_score > 75 ? '#ef4444' : pred.waste_risk_score > 50 ? '#eab308' : '#22c55e'} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Predicted Waste:</span>
                  <span className="font-semibold text-gray-900">{pred.predicted_waste_qty} units</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Est. Loss:</span>
                  <span className="font-semibold text-tomato-600">{formatCurrency(pred.financial_loss_estimate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Probable Reason:</span>
                  <span className="text-gray-800">{pred.primary_waste_reason}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                {pred.recommended_action === 'donate_now' && <span className="block text-center w-full bg-tomato-100 text-tomato-800 py-2 rounded-md font-medium text-sm">Action: Donate Now</span>}
                {pred.recommended_action === 'discount' && <span className="block text-center w-full bg-gold-100 text-gold-800 py-2 rounded-md font-medium text-sm">Action: Apply Discount</span>}
                {pred.recommended_action === 'monitor' && <span className="block text-center w-full bg-forest-50 text-forest-800 py-2 rounded-md font-medium text-sm">Action: Monitor Stock</span>}
                {pred.recommended_action === 'safe' && <span className="block text-center w-full bg-green-50 text-green-700 py-2 rounded-md font-medium text-sm">Status: Safe</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
    </Layout>
  );
};

export default DataAnalyticsPage;
