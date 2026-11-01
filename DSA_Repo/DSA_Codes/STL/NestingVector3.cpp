//vectors of vector.
// v[0][0] 0 th vector ka zeroth element
#include<bits/stdc++.h>
using namespace std;
void printVec(vector<int> &v){
    cout<<"size " << v.size() <<endl;
    for(int i=0; i<v.size(); ++i){
        cout<<v[i]<<" ";
    }
    cout<<endl;
}
int main(){
  int N;
  cin>>N; //how many vector we want to enter
  vector<vector<int>>v; // this is vector of vector.
  for(int i =0 ; i<N; i++)
  { 
    int n;
    cin>>n; // kitne size ka array input lena hai.
    vector<int>temp; //vector temp name has been created.
    for(int j=0; j<n; j++)
    {
      int x;
      cin>>x;
      temp.push_back(x);
    }
    v.push_back(temp);
    }
    // v[0].push_back(10)  rows and column are now dynamic;
    // v.push_back(vector<int>()); ek khali vector push kr diye jiska size zero rhega.
    for(int i= 0; i<v.size(); i++)
    {
      printVec(v[i]);
    }
    cout<<v[0][1];  //0th vector ka 1st index wala element

}
// 3
// 4
// 1 2 3 5
// 2
// 8 9
// 3 
// 7 8 9
// size4
// 1 2 3 5
// size2
// 8 9
// size3
// 7 8 9