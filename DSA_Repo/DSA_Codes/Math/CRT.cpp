//                ******************************************************************
//                                    Author: Neeraj Joshi

#include<bits/stdc++.h>
using namespace std;
#define fastio() ios_base::sync_with_stdio(false);cin.tie(NULL);cout.tie(NULL)
#define M 1000000007
#define MOD1 998244353
#define INF 1e18
#define nline "\n"
#define pb push_back
#define ppb pop_back
#define mp make_pair
#define ff first
#define ss second
#define PI 3.141592653589793238462
#define set_bits __builtin_popcountll
#define sz(x) ((int)(x).size())
#define all(x) (x).begin(), (x).end()
 
typedef long long ll;
typedef unsigned long long ull;
typedef long double lld;
// typedef tree<pair<int, int>, null_type, less<pair<int, int>>, rb_tree_tag, tree_order_statistics_node_update > pbds; // find_by_order, order_of_key
 
#ifndef ONLINE_JUDGE
#define debug(x) cerr << #x <<" "; _print(x); cerr << endl;
#else
#define debug(x)
#endif
 
void _print(ll t) {cerr << t;}
void _print(int t) {cerr << t;}
void _print(string t) {cerr << t;}
void _print(char t) {cerr << t;}
void _print(lld t) {cerr << t;}
void _print(double t) {cerr << t;}
void _print(ull t) {cerr << t;}
 
template <class T, class V> void _print(pair <T, V> p);
template <class T> void _print(vector <T> v);
template <class T> void _print(set <T> v);
template <class T, class V> void _print(map <T, V> v);
template <class T> void _print(multiset <T> v);
template <class T, class V> void _print(pair <T, V> p) {cerr << "{"; _print(p.ff); cerr << ","; _print(p.ss); cerr << "}";}
template <class T> void _print(vector <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T> void _print(set <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T> void _print(multiset <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T, class V> void _print(map <T, V> v) {cerr << "[ "; for (auto i : v) {_print(i); cerr << " ";} cerr << "]";}
 

vector<int>fac(2,1);
ll MOD(ll a,ll b){
     a%=M;
     b%=M;
     return (1LL*a*b)%M;
}

ll bnr(ll a,ll b){
     ll res=1;
     while(b>0){
          if(b&1){
               res=MOD(res,a);
          }
          a=MOD(a,a);
          b>>=1;
     }
     return res;
}
ll ncr(int n,int r){
     if(r>n) return 0;
     ll num=fac[n];
     ll den=MOD(fac[n-r],fac[r]);
     den=bnr(den,M-2);
     return MOD(num,den);
}
int ADD(int a,int b){
     a%=M;
     b%=M;
     return (1LL*a+b)%M;
}
ll countSetBit(ll n){
     ll cnt=0;
     for(int i=63;i>=0;i--){
          if(((1LL<<i)&n)!=0) cnt++;
     }
     return cnt;
}
ll sqrtH(ll a){
     ll start=1,end=1e10;
     ll ans=-1;
     while(start<=end){
          ll mid=(start+end)/2;
          if(mid<=a/mid){
               ans=mid;
               start=mid+1;
          }
          else end=mid-1;
     }
     return ans;
}

bool sett(ll a,ll b){
     if((a&(1LL<<b))==0) return 0;
     else return 1;
}
void fix(int &a,int ind){
     a=a|(1LL<<ind);
}
void unfix(int &a,int ind){
     a=a&(~(1ll<<ind));
}
double g(ll a,ll b){
     double res=a*a+b*b;
     debug(res);
     res=sqrtl(1.0*res);
     debug(res);
     return res;
}
template<typename T>
T extgcd(T a, T b, T &x, T &y) {
  if (a == 0) {
    x = 0;
    y = 1;
    return b;
  }
  T p = b / a;
  T g = extgcd(b - p * a, a, y, x);
  x -= p * y;
  return g;
}
 
template<typename T>
bool diophantine(T a, T b, T c, T &x, T &y, T &g) {
  if (a == 0 && b == 0) {
    if (c == 0) {
      x = y = g = 0;
      return true;
    }
    return false;
  }
  if (a == 0) {
    if (c % b == 0) {
      x = 0;
      y = c / b;
      g = abs(b);
      return true;
    }
    return false;
  }
  if (b == 0) {
    if (c % a == 0) {
      x = c / a;
      y = 0;
      g = abs(a);
      return true;
    }
    return false;
  }
  g = extgcd(a, b, x, y);
  if (c % g != 0) {
    return false;
  }
  T dx = c / a;
  c -= dx * a;
  T dy = c / b;
  c -= dy * b;
  x = dx + (T) ((1LL)* x * (c / g) % b);
  y = dy + (T) ((1LL)* y * (c / g) % a);
  g = abs(g);
  return true;
  // |x|, |y| <= max(|a|, |b|, |c|) [tested]
}
 
bool crt(long long k1, long long m1, long long k2, long long m2, long long &k, long long &m) {
  k1 %= m1;
  if (k1 < 0) k1 += m1;
  k2 %= m2;
  if (k2 < 0) k2 += m2;
  long long x, y, g;
  if (!diophantine(m1, -m2, k2 - k1, x, y, g)) {
    return false;
  }
  long long dx = m2 / g;
  long long delta = x / dx - (x % dx < 0);
  k = m1 * (x - dx * delta) + k1;
  m = m1 / g * m2;
  assert(0 <= k && k < m);
  return true;
}
void solve(){
   
   ll n,m,k;
   cin>>n>>m>>k;
   vector<int>a(n),b(m);
   map<int,int>ind;
   vector<ll>rounds;
   ll gcd=__gcd(n,m);
   ll lcm=(n*m)/gcd;
   for(int i=0;i<n;i++) cin>>a[i],ind[a[i]]=i;
     debug(ind);
   for(int i=0;i<m;i++){
        cin>>b[i];
        if(ind.count(b[i])>0){
          debug(i);
          debug(ind[b[i]]);
           if(abs(ind[b[i]]-i)%gcd==0){
                ll kd,md;
                crt(1LL*ind[b[i]],n,1LL*i,m,kd,md);
                rounds.pb(kd);
           }
        }
   }
   debug(rounds);
   //rounds.pb(0);
   ll start=0;
   ll end=1e18;
   ll ans=1e18;
   while(start<=end){
       debug(start);
       debug(end);
       ll mid=(start+end)/2;
       ll cnt=0;
       for(int i=0;i<sz(rounds);i++){
            if(rounds[i]<=mid){
               cnt+=(1+(mid-rounds[i])/lcm);
            }
       }
       cnt=mid+1-cnt;
       if(cnt>=k){
          ans=mid;
          end=mid-1;
       } else start=mid+1;
   }
   cout<<ans+1<<nline;
}

int main() {
#ifndef ONLINE_JUDGE
     freopen("Error.txt", "w", stderr);
#endif 
     fastio();  
     //for(int i=1;i<=200010;i++) fac[i]=MOD(fac[i-1],i);
     int t=1;
     //cin>>t;
     while(t--){
          debug(t);
          solve();
     }
}